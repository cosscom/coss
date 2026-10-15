/**
 * `coss/device`: recognizes the browser behind risk events. Call `collectDevice()` in the browser
 * when the user submits a form, send the token to your server with it, and pass it to
 * `coss.risk.assess({ device: { token } })`.
 *
 * The token carries a random id this browser keeps in `localStorage` (`coss_device_id`, no
 * cookies) and coarse facts: time zone, languages, platform, screen size, touch support, and
 * whether the browser is automated (WebDriver, headless). No canvas, WebGL, font or audio
 * fingerprinting: a browser whose storage is cleared looks like a new one. COSS keeps only a keyed
 * hash of the id.
 *
 * Collects nothing until called, and never throws: outside a browser the token simply carries
 * fewer facts.
 */

/** The token format version, checked by the API. */
const TOKEN_PREFIX = "cd1.";
const STORAGE_KEY = "coss_device_id";
const HEADLESS = /HeadlessChrome|PhantomJS|SlimerJS/;

export interface CollectDeviceOptions {
  /**
   * Where the device id is kept: `local` (default) remembers it in `localStorage`; `memory`
   * keeps it only for this page (for example until the user consents to storage).
   */
  storage?: "local" | "memory";
}

let memoryId: string | undefined;

function randomId(): string {
  const bytes = new Uint8Array(16);
  globalThis.crypto.getRandomValues(bytes);
  return base64Url(bytes);
}

function base64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function deviceId(storage: "local" | "memory"): string {
  if (storage === "local") {
    try {
      const store = globalThis.localStorage;
      if (store) {
        const stored = store.getItem(STORAGE_KEY);
        if (stored && /^[A-Za-z0-9_-]{16,64}$/.test(stored)) return stored;
        const id = randomId();
        store.setItem(STORAGE_KEY, id);
        return id;
      }
    } catch {
      // Storage is blocked (private modes, sandboxed frames): fall back to this page.
    }
  }
  memoryId ??= randomId();
  return memoryId;
}

function safely<T>(read: () => T, fallback: T): T {
  try {
    return read() ?? fallback;
  } catch {
    return fallback;
  }
}

/** Returns a token for `device.token` in `coss.risk.assess()`. Make a new one per submission. */
export function collectDevice(options: CollectDeviceOptions = {}): string {
  const nav = globalThis.navigator as
    | (Navigator & { userAgentData?: { platform?: string } })
    | undefined;
  const screen = globalThis.screen as Screen | undefined;
  const userAgent = safely(() => nav?.userAgent ?? "", "");
  const payload = {
    id: deviceId(options.storage ?? "local"),
    t: Date.now(),
    tz: safely<string | null>(
      () => Intl.DateTimeFormat().resolvedOptions().timeZone.slice(0, 64) || null,
      null,
    ),
    l: safely(() => [...(nav?.languages ?? [])].slice(0, 10).map((l) => l.slice(0, 35)), []),
    p: safely<string | null>(
      () => (nav?.userAgentData?.platform || nav?.platform || "").slice(0, 64) || null,
      null,
    ),
    s: safely<[number, number] | null>(
      () => (screen ? [Math.round(screen.width), Math.round(screen.height)] : null),
      null,
    ),
    tp: safely<number | null>(
      () => (typeof nav?.maxTouchPoints === "number" ? Math.round(nav.maxTouchPoints) : null),
      null,
    ),
    wd: safely(() => nav?.webdriver === true, false),
    hl: HEADLESS.test(userAgent),
  };
  return `${TOKEN_PREFIX}${base64Url(new TextEncoder().encode(JSON.stringify(payload)))}`;
}
