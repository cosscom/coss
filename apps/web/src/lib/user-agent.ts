/** Ordered: Edge and Opera contain "Chrome", Chrome contains "Safari". */
const BROWSERS: [RegExp, string][] = [
  [/Edg(?:e|A|iOS)?\//, "Edge"],
  [/OPR\/|Opera/, "Opera"],
  [/Firefox\/|FxiOS\//, "Firefox"],
  [/Chrome\/|CriOS\//, "Chrome"],
  [/Safari\//, "Safari"],
];

/** Ordered: Android contains "Linux", iOS contains "Mac OS X". */
const SYSTEMS: [RegExp, string][] = [
  [/Android/, "Android"],
  [/iPhone|iPad|iPod/, "iOS"],
  [/Windows/, "Windows"],
  [/Mac OS X|Macintosh/, "macOS"],
  [/CrOS/, "ChromeOS"],
  [/Linux/, "Linux"],
];

/**
 * The iOS app: `COSS-iOS/<version>` (it sets it), or before that iOS's default for a native app,
 * `COSS/<build> CFNetwork/… Darwin/…`.
 */
const IOS_APP = /^COSS-iOS\/|^COSS\/\S+ CFNetwork\//;

/** "Chrome on macOS" from a User-Agent header; a best-effort label for the sessions list. */
export function describeUserAgent(userAgent: string | null | undefined): string {
  if (!userAgent) return "Unknown device";
  if (IOS_APP.test(userAgent)) return "COSS app on iOS";
  const browser = BROWSERS.find(([pattern]) => pattern.test(userAgent))?.[1];
  const system = SYSTEMS.find(([pattern]) => pattern.test(userAgent))?.[1];
  if (browser && system) return `${browser} on ${system}`;
  return browser ?? system ?? (userAgent.length > 48 ? `${userAgent.slice(0, 47)}…` : userAgent);
}
