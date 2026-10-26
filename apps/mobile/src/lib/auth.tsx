import type { TokenResponse } from "@coss/companion";
import type { QueryClient } from "@tanstack/react-query";
import Constants from "expo-constants";
import * as Crypto from "expo-crypto";
import * as SecureStore from "expo-secure-store";
import * as WebBrowser from "expo-web-browser";
import { createContext, type ReactNode, use, useEffect, useRef, useState } from "react";
import { type ApiClient, createApiClient } from "./api";
import { DASHBOARD_URL } from "./config";
import { forgetOrganization } from "./last-org";
import { authorizeUrl, createPkceRequest, parseCallback } from "./pkce";
import { refreshPushRegistration, stopPush, watchPushToken } from "./push";

const TOKEN_KEY = "coss.session";
// How the dashboard's session list names this app (it records the sign-in's User-Agent).
const USER_AGENT = `COSS-iOS/${Constants.expoConfig?.version ?? "0"}`;
// A credential whose sign-out didn't reach the dashboard (offline): revoked on a later start.
const PENDING_REVOCATION_KEY = "coss.pending-revocation";
const REDIRECT_URI = "coss://auth/callback";
const KEYCHAIN: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

export type AuthStatus = "loading" | "signed_out" | "signed_in";

/** `message: null` when the user canceled. */
export type SignInResult = { ok: true } | { ok: false; message: string | null };

type AuthValue = {
  status: AuthStatus;
  api: ApiClient;
  signIn: () => Promise<SignInResult>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthValue | null>(null);

const pkceCrypto = {
  randomBytes: (count: number) => Crypto.getRandomBytes(count),
  sha256: async (data: Uint8Array<ArrayBuffer>) =>
    new Uint8Array(await Crypto.digest(Crypto.CryptoDigestAlgorithm.SHA256, data)),
};

export function AuthProvider(props: { queryClient: QueryClient; children: ReactNode }) {
  const { queryClient } = props;
  const [status, setStatus] = useState<AuthStatus>("loading");
  const token = useRef<string | null>(null);

  const forget = async () => {
    token.current = null;
    setStatus("signed_out");
    queryClient.clear();
    await SecureStore.deleteItemAsync(TOKEN_KEY, KEYCHAIN).catch(() => {});
    await forgetOrganization();
  };

  const [api] = useState(() =>
    createApiClient({
      baseUrl: DASHBOARD_URL,
      getToken: () => token.current,
      onUnauthorized: () => void forget(),
      userAgent: USER_AGENT,
    }),
  );

  useEffect(() => {
    SecureStore.getItemAsync(TOKEN_KEY, KEYCHAIN)
      .catch(() => null)
      .then((stored) => {
        token.current = stored;
        setStatus(stored ? "signed_in" : "signed_out");
      });
    void revokePending();
  }, []);

  // Push registrations belong to the session: signing out ends them on the server.
  useEffect(() => {
    if (status !== "signed_in") return;
    void refreshPushRegistration(api).then((registered) => {
      if (registered) void queryClient.invalidateQueries({ queryKey: ["push"] });
    });
    return watchPushToken(api);
  }, [status, api, queryClient]);

  const signIn = async (): Promise<SignInResult> => {
    const request = await createPkceRequest(pkceCrypto);
    // Ephemeral: Safari's cookies aren't shared, so a code is only minted after signing in here.
    const result = await WebBrowser.openAuthSessionAsync(
      authorizeUrl(DASHBOARD_URL, request),
      REDIRECT_URI,
      { preferEphemeralSession: true },
    );
    if (result.type !== "success") return { ok: false, message: null };
    const callback = parseCallback(result.url, request.state);
    if (callback.kind === "denied") return { ok: false, message: null };
    if (callback.kind === "invalid") {
      return { ok: false, message: "The sign-in response wasn't valid. Try again." };
    }
    const { data, error } = await api<TokenResponse>("/auth/token", {
      method: "POST",
      body: JSON.stringify({ code: callback.code, code_verifier: request.verifier }),
    });
    if (error) return { ok: false, message: error.message };
    await SecureStore.setItemAsync(TOKEN_KEY, data.token, KEYCHAIN);
    token.current = data.token;
    setStatus("signed_in");
    return { ok: true };
  };

  const signOut = async () => {
    const credential = token.current;
    await stopPush();
    // Don't hold the user on a slow network: an unreached sign-out is retried on a later start.
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8_000);
    const { error } = await api("/auth/sign-out", { method: "POST", signal: controller.signal });
    clearTimeout(timeout);
    // 401: the session had already ended. Anything else: try again on a later start.
    if (error && error.status !== 401 && credential) {
      await SecureStore.setItemAsync(PENDING_REVOCATION_KEY, credential, KEYCHAIN).catch(() => {});
    }
    await forget();
  };

  return <AuthContext value={{ status, api, signIn, signOut }}>{props.children}</AuthContext>;
}

async function revokePending(): Promise<void> {
  const pending = await SecureStore.getItemAsync(PENDING_REVOCATION_KEY, KEYCHAIN).catch(
    () => null,
  );
  if (!pending) return;
  const revoke = createApiClient({
    baseUrl: DASHBOARD_URL,
    getToken: () => pending,
    onUnauthorized: () => {},
    userAgent: USER_AGENT,
  });
  const { error } = await revoke("/auth/sign-out", { method: "POST" });
  if (!error || error.status === 401) {
    await SecureStore.deleteItemAsync(PENDING_REVOCATION_KEY, KEYCHAIN).catch(() => {});
  }
}

export function useAuth(): AuthValue {
  const value = use(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}
