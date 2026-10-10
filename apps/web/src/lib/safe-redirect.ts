/**
 * Returns `next` only when it is a same-origin relative path ("/x", not "//host" or "/\host");
 * otherwise `fallback`. Used for post-sign-in redirects so they can't send users off-site.
 */
export function safeRedirectPath(next: unknown, fallback = "/"): string {
  if (typeof next !== "string" || !next.startsWith("/")) return fallback;
  if (next.startsWith("//") || next.startsWith("/\\")) return fallback;
  // Control characters (e.g. tab/newline) are stripped by URL parsers and can smuggle a host.
  // biome-ignore lint/suspicious/noControlCharactersInRegex: matching them is the point.
  if (/[\u0000-\u001f\u007f]/.test(next)) return fallback;
  return next;
}
