import { highlight } from "@/components/calendar/site/highlight";

export type SnippetTokenKind = "tag" | "attr" | "op" | "string" | "value";
export type SnippetPalette = Record<SnippetTokenKind, [light: string, dark: string]>;

const SAMPLE = `<Kloq a="s" b={1} />`;
const PROBES: Record<SnippetTokenKind, string> = {
  tag: "Kloq",
  attr: "a",
  op: "=",
  string: `"s"`,
  value: "1",
};

/** The colours shiki gives each kind of token the playground snippet can contain, read off a highlighted sample. */
export async function snippetPalette(): Promise<SnippetPalette> {
  const html = await highlight(SAMPLE, "tsx");
  const colors = new Map<string, [string, string]>();
  for (const [, light, dark, text] of html.matchAll(
    /<span style="--shiki-light:([^;"]+);--shiki-dark:([^;"]+)">([^<]*)<\/span>/g,
  )) {
    if (!colors.has(text.trim())) colors.set(text.trim(), [light, dark]);
  }
  const kinds = Object.keys(PROBES) as SnippetTokenKind[];
  return Object.fromEntries(
    kinds.map((kind) => {
      const pair = colors.get(PROBES[kind]);
      if (!pair)
        throw new Error(
          `snippetPalette: shiki emitted no "${PROBES[kind]}" token for ${kind}; its HTML shape changed`,
        );
      return [kind, pair];
    }),
  ) as SnippetPalette;
}
