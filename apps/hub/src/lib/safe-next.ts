/** A `next` parameter the hub will follow: a path of its own, never another origin. */
export function safeNext(value: string | string[] | undefined, fallback = "/"): string {
  const next = Array.isArray(value) ? value[0] : value;
  return next && /^\/(?!\/)/.test(next) ? next : fallback;
}
