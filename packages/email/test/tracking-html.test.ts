import { describe, expect, test } from "bun:test";
import { instrumentHtml } from "../src/tracking-html.ts";

const BASE = "https://api.coss.test";
const TOKEN = "t".repeat(32);
const both = { baseUrl: BASE, token: TOKEN, opens: true, clicks: true };

describe("instrumentHtml", () => {
  test("edits reconstructed anchors once and keeps distinct links numbered consecutively", () => {
    const html =
      '<p><a href="https://example.com">one<p>two</a>' + '<a href="https://example.com">three</a>';
    const out = instrumentHtml(html, { ...both, opens: false });
    expect(out.links).toEqual([
      { position: 0, url: "https://example.com" },
      { position: 1, url: "https://example.com" },
    ]);
    expect(out.html).toBe(
      `<p><a href="${BASE}/t/c/${TOKEN}/0">one<p>two</a>` +
        `<a href="${BASE}/t/c/${TOKEN}/1">three</a>`,
    );
  });

  test("removes a reconstructed anchor's opt-out attribute only once", () => {
    const html = '<p><a data-coss-no-track href="https://example.com">one<p>two</a>';
    const out = instrumentHtml(html, { ...both, opens: false });
    expect(out.links).toEqual([]);
    expect(out.html).toBe(html.replace("data-coss-no-track", ""));
  });

  test("rewrites http(s) links in order and stores their decoded targets", () => {
    const html =
      '<html><body><a href="https://acme.com/a?x=1&amp;y=2">A</a> ' +
      "<A HREF='http://acme.com/b' class=\"x\">B</A></body></html>";
    const out = instrumentHtml(html, { ...both, opens: false });
    expect(out.links).toEqual([
      { position: 0, url: "https://acme.com/a?x=1&y=2" },
      { position: 1, url: "http://acme.com/b" },
    ]);
    expect(out.html).toBe(
      `<html><body><a href="${BASE}/t/c/${TOKEN}/0">A</a> ` +
        `<A href="${BASE}/t/c/${TOKEN}/1" class="x">B</A></body></html>`,
    );
  });

  test("leaves other links, merge tags and opted-out anchors alone", () => {
    const html =
      '<a href="mailto:a@b.c">m</a><a href="tel:1">t</a><a href="#top">h</a>' +
      '<a href="/relative">r</a><a href="https://acme.com/{{id}}">v</a><a>none</a>' +
      '<a data-coss-no-track href="https://acme.com/keep">k</a>';
    const out = instrumentHtml(html, { ...both, opens: false });
    expect(out.links).toEqual([]);
    expect(out.html).toBe(html.replace(" data-coss-no-track", " "));
  });

  test("adds the pixel before </body>, or at the end without one", () => {
    const pixel = `<img src="${BASE}/t/o/${TOKEN}"`;
    const withBody = instrumentHtml("<html><body><p>Hi</p></body></html>", {
      ...both,
      clicks: false,
    });
    expect(withBody.html.startsWith(`<html><body><p>Hi</p>${pixel}`)).toBe(true);
    expect(withBody.html.endsWith("/></body></html>")).toBe(true);

    const fragment = instrumentHtml("<p>Hi", { ...both, clicks: false });
    expect(fragment.html.startsWith(`<p>Hi${pixel}`)).toBe(true);
  });

  test("preserves everything outside the edits byte for byte", () => {
    const html =
      "<!doctype html>\n<!--[if mso]><table><![endif]-->\n<body style='x'>  <a  href = \"https://a.b\" >x</a>\n</body>";
    const out = instrumentHtml(html, both);
    expect(out.html).toBe(
      `<!doctype html>\n<!--[if mso]><table><![endif]-->\n<body style='x'>  <a  href="${BASE}/t/c/${TOKEN}/0" >x</a>\n` +
        `<img src="${BASE}/t/o/${TOKEN}" width="1" height="1" alt="" style="display:block;width:1px;height:1px;border:0;" /></body>`,
    );
  });

  test("handles malformed HTML and is a no-op with tracking off", () => {
    const html = '<div><a href="https://a.b/1"><b>x</a></div><a href="https://a.b/2"';
    const out = instrumentHtml(html, { ...both, opens: false });
    expect(out.links.map((link) => link.url)).toEqual(["https://a.b/1"]);
    expect(instrumentHtml(html, { ...both, opens: false, clicks: false })).toEqual({
      html,
      links: [],
    });
  });
});
