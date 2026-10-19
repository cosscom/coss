// biome-ignore lint/suspicious/noControlCharactersInRegex: matches the escapes Output.style adds.
const STYLE = /\u001b\[[\d;]*m/g;

function width(text: string): number {
  return text.replace(STYLE, "").length;
}

/** Rows as aligned columns, two spaces apart; styled cells are measured without their escapes. */
export function table(rows: readonly (readonly string[])[]): string[] {
  const widths: number[] = [];
  for (const row of rows) {
    row.forEach((cell, index) => {
      widths[index] = Math.max(widths[index] ?? 0, width(cell));
    });
  }
  return rows.map((row) =>
    row
      .map((cell, index) =>
        index === row.length - 1 ? cell : cell + " ".repeat((widths[index] ?? 0) - width(cell)),
      )
      .join("  ")
      .trimEnd(),
  );
}
