import { codeToHtml } from "shiki";

const cache = new Map<string, Promise<string>>();

/** Inline shiki spans carrying `--shiki-light` / `--shiki-dark`, the docs' themes. Server only; pass the result as a pane's `html`. */
export function highlight(code: string, lang: string): Promise<string> {
  const key = `${lang}\n${code}`;
  let html = cache.get(key);
  if (!html) {
    html = codeToHtml(code, {
      lang,
      themes: { light: "github-light", dark: "github-dark" },
      defaultColor: false,
      structure: "inline",
    });
    cache.set(key, html);
  }
  return html;
}
