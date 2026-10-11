"use client";

import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";

/**
 * Cloudflare Turnstile for the auth forms. The token goes to Better Auth's `captcha` plugin
 * (@coss/auth) as the `x-captcha-response` header. The site key comes from the server page
 * (`TURNSTILE_SITE_KEY`, read at runtime); `null` turns the widget off (local development).
 * Tokens are single-use: call `reset()` after every attempt. The CSP allows the script and its
 * iframe (`src/lib/security-headers.ts`).
 */

const SCRIPT_URL = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

type TurnstileApi = {
  render(
    container: HTMLElement,
    options: {
      sitekey: string;
      action: string;
      size: "flexible";
      callback: (token: string) => void;
      "expired-callback": () => void;
      "error-callback": () => void;
    },
  ): string | undefined;
  reset(widgetId: string): void;
  remove(widgetId: string): void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

let scriptLoading: Promise<TurnstileApi> | undefined;

function loadTurnstile(): Promise<TurnstileApi> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  scriptLoading ??= new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT_URL;
    script.async = true;
    script.onload = () =>
      window.turnstile ? resolve(window.turnstile) : reject(new Error("Turnstile didn't load."));
    script.onerror = () => {
      scriptLoading = undefined;
      script.remove();
      reject(new Error("Turnstile didn't load."));
    };
    document.head.append(script);
  });
  return scriptLoading;
}

export type Turnstile = {
  /** The widget to render inside the form (nothing when Turnstile is off). */
  widget: ReactNode;
  /** False while Turnstile is on and has no token yet: keep the submit button disabled. */
  ready: boolean;
  /** Headers for the Better Auth call (`fetchOptions.headers`). */
  headers: Record<string, string> | undefined;
  /** Shown when the challenge couldn't load or run. */
  error: string | null;
  /** Discards the used token and runs a new challenge. */
  reset: () => void;
};

/** `action` labels the challenge in Cloudflare's analytics (`sign-up`, `sign-in`, …). */
export function useTurnstile(siteKey: string | null, action: string): Turnstile {
  const container = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!siteKey) return;
    let active = true;
    loadTurnstile().then(
      (api) => {
        if (!active || !container.current) return;
        widgetId.current =
          api.render(container.current, {
            sitekey: siteKey,
            action,
            size: "flexible",
            callback: (value) => {
              setFailed(false);
              setToken(value);
            },
            "expired-callback": () => setToken(null),
            "error-callback": () => {
              setToken(null);
              setFailed(true);
            },
          }) ?? null;
      },
      () => active && setFailed(true),
    );
    return () => {
      active = false;
      if (widgetId.current) window.turnstile?.remove(widgetId.current);
      widgetId.current = null;
    };
  }, [siteKey, action]);

  const reset = useCallback(() => {
    setToken(null);
    if (widgetId.current) window.turnstile?.reset(widgetId.current);
  }, []);

  return {
    widget: siteKey ? <div className="min-h-[65px]" ref={container} /> : null,
    ready: !siteKey || token !== null,
    headers: siteKey && token ? { "x-captcha-response": token } : undefined,
    error: failed
      ? "We couldn't check that you're human. Reload the page or try another browser."
      : null,
    reset,
  };
}
