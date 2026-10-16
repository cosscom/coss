import type { PushSettings, RegisterPushRequest } from "@coss/companion";
import * as Notifications from "expo-notifications";
import type { ApiClient, ApiResult } from "./api";

// Notifications arriving while the app is open still show, like they would outside it.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export type PushPermission = "granted" | "denied" | "undetermined";

export async function pushPermission(): Promise<PushPermission> {
  const permissions = await Notifications.getPermissionsAsync();
  if (permissions.granted) return "granted";
  return permissions.canAskAgain ? "undetermined" : "denied";
}

async function register(api: ApiClient, token?: string): Promise<ApiResult<PushSettings>> {
  const body: RegisterPushRequest = {
    token: token ?? String((await Notifications.getDevicePushTokenAsync()).data),
    // Development builds get APNs sandbox tokens (the plugin's default `aps-environment`).
    apns_environment: __DEV__ ? "sandbox" : "production",
  };
  return api<PushSettings>("/push", { method: "PUT", body: JSON.stringify(body) });
}

/** Asks iOS for permission (the first time), then registers this device for this session. */
export async function enablePush(api: ApiClient): Promise<ApiResult<PushSettings> | null> {
  const permissions = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowSound: true, allowBadge: false },
  });
  if (!permissions.granted) return null;
  return register(api);
}

/**
 * Registers this session's device: a sign-in is a new session (the old registration ended with
 * the old one), and iOS can hand out a new token at any time. Asks iOS first while it never has
 * (iOS shows its prompt once per install). Whether it registered.
 */
export async function refreshPushRegistration(api: ApiClient): Promise<boolean> {
  try {
    const permission = await pushPermission();
    if (permission === "undetermined") return Boolean((await enablePush(api))?.data);
    if (permission === "granted") return Boolean((await register(api)).data);
  } catch (error) {
    console.warn("[push] registration failed", error);
  }
  return false;
}

/**
 * Stops this install's pushes on the device itself: APNs then refuses the token, so the server
 * drops the registration even if signing out couldn't reach it.
 */
export async function stopPush(): Promise<void> {
  await Notifications.unregisterForNotificationsAsync().catch(() => {});
}

/** Re-registers whenever iOS rotates the token. */
export function watchPushToken(api: ApiClient): () => void {
  const subscription = Notifications.addPushTokenListener((token) => {
    void register(api, String(token.data)).catch(() => {});
  });
  return () => subscription.remove();
}
