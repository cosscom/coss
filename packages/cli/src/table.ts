import type { Output, Style } from "./output.ts";

/** A table cell: text (maybe already styled), or text with a style `out` applies. */
export type Cell = string | { text: string; style: Style | Style[] };

// biome-ignore lint/suspicious/noControlCharactersInRegex: matches the escapes Output.style adds.
const STYLE = /\u001b\[[\d;]*m/g;

const text = (cell: Cell) => (typeof cell === "string" ? cell : cell.text);

function width(cell: Cell): number {
  return text(cell).replace(STYLE, "").length;
}

/**
 * Rows as aligned lines, columns two spaces apart; widths count the text only, never the styles'
 * escapes. Values are never cut: they are often meant to be copied (DNS records, ids).
 */
export function table(rows: readonly (readonly Cell[])[], out?: Output): string[] {
  const widths: number[] = [];
  for (const row of rows) {
    row.forEach((cell, index) => {
      widths[index] = Math.max(widths[index] ?? 0, width(cell));
    });
  }
  return rows.map((row) =>
    row
      .map((cell, index) => {
        const padding =
          index === row.length - 1 ? "" : " ".repeat((widths[index] ?? 0) - width(cell));
        if (typeof cell === "string") return cell + padding;
        return (out ? out.style(cell.style, cell.text) : cell.text) + padding;
      })
      .join("  ")
      .trimEnd(),
  );
}
