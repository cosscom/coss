/** The first sentence (or line) of a request, as its title. */
export function titleOf(body: string): string {
  const first = body.trim().split(/\n/)[0]?.trim() ?? "";
  const sentence = first.split(/(?<=[.!?])\s/)[0]?.trim() ?? first;
  const title = (sentence || first).replace(/[.!?]+$/, "");
  return title.length > 90 ? `${title.slice(0, 87).trimEnd()}…` : title;
}
