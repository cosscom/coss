/** Header encoding for SES: non-ASCII display names must be RFC 2047 encoded-words. */
import { parseEmailAddress } from "../schemas.ts";

const NON_ASCII = /\P{ASCII}/u;
const ENCODED_WORD_MAX = 75;

/** `=?UTF-8?B?…?=` words (each at most 75 characters, split on character boundaries). */
export function encodeWords(text: string): string {
  const words: string[] = [];
  let chunk = "";
  const wordOf = (value: string) => `=?UTF-8?B?${Buffer.from(value, "utf8").toString("base64")}?=`;
  for (const char of text) {
    if (wordOf(chunk + char).length > ENCODED_WORD_MAX) {
      words.push(wordOf(chunk));
      chunk = "";
    }
    chunk += char;
  }
  if (chunk) words.push(wordOf(chunk));
  return words.join(" ");
}

/** The address as SES accepts it: an ASCII display name is kept, any other is encoded. */
export function encodeAddress(value: string): string {
  const { name, address } = parseEmailAddress(value);
  if (name === null) return address;
  if (!NON_ASCII.test(name)) return `${name} <${address}>`;
  const unquoted =
    name.startsWith('"') && name.endsWith('"') ? name.slice(1, -1).replace(/\\(.)/g, "$1") : name;
  return `${encodeWords(unquoted)} <${address}>`;
}
