export type MentionQuery = { start: number; end: number; query: string };

export function getMentionQuery(
  text: string,
  caret: number,
): MentionQuery | null {
  const match = text.slice(0, caret).match(/(?:^|\s)@([\p{L}\p{N}_.-]*)$/u);
  if (match?.[1] === undefined) return null;
  const suffix = text.slice(caret).match(/^[\p{L}\p{N}_.-]*/u)?.[0] ?? "";
  return {
    start: caret - match[1].length - 1,
    end: caret + suffix.length,
    query: match[1],
  };
}

export function insertMention(
  text: string,
  mention: MentionQuery,
  handle: string,
): { text: string; caret: number } {
  const remainder = text.slice(mention.end);
  const separator = /^[\n.,!?;:)]/.test(remainder) ? "" : " ";
  const prefix = `${text.slice(0, mention.start)}@${handle}${separator}`;
  const suffix = remainder.replace(/^ /, "");
  return { text: prefix + suffix, caret: prefix.length };
}

export function deleteMentionBackward(
  text: string,
  caret: number,
): { text: string; caret: number } | null {
  const match = text.slice(0, caret).match(/(?:^|\s)@([\p{L}\p{N}_.-]+)( *)$/u);
  if (match?.[1] === undefined || match[2] === undefined) return null;
  const start = caret - match[1].length - match[2].length - 1;
  return { text: text.slice(0, start) + text.slice(caret), caret: start };
}
