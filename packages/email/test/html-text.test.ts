import { describe, expect, test } from "bun:test";
import { htmlToText } from "../src/html-text.ts";

describe("htmlToText", () => {
  test("keeps paragraphs and line breaks, collapsing whitespace like a browser", () => {
    expect(
      htmlToText(
        "<html><head><title>Receipt</title><style>p { color: red }</style></head><body>" +
          "<h1>Thanks for   your order,\n  Ada!</h1>" +
          "<p>Your order <strong>#1234</strong> has shipped.<br>It arrives Friday.</p>" +
          "<div>Line one</div><div>Line two</div><p>A<br><br><br><br>B</p></body></html>",
      ),
    ).toBe(
      "Thanks for your order, Ada!\n\nYour order #1234 has shipped.\nIt arrives Friday.\n\n" +
        "Line one\nLine two\n\nA\n\nB",
    );
  });

  test("follows links with their target unless the label already shows it", () => {
    expect(
      htmlToText(
        '<p><a href="https://acme.com/orders/1?x=1&amp;y=2">Track your order</a></p>' +
          '<p>Visit <a href="https://www.acme.com/">acme.com</a> or <a href="https://acme.com/docs">https://acme.com/docs</a>.</p>' +
          '<p><a href="mailto:help@acme.com">help@acme.com</a>, <a href="mailto:help@acme.com?subject=Hi">email us</a></p>' +
          '<p><a href="#top">Top</a> <a href="tel:+15550100">Call</a> <a href="/relative">Relative</a></p>' +
          '<p>Logo: <a href="https://acme.com/home"><img src="logo.png" alt=""></a></p>',
      ),
    ).toBe(
      "Track your order [https://acme.com/orders/1?x=1&y=2]\n\n" +
        "Visit acme.com or https://acme.com/docs.\n\n" +
        "help@acme.com, email us [help@acme.com]\n\n" +
        "Top Call Relative\n\n" +
        "Logo: https://acme.com/home",
    );
  });

  test("marks lists, prefixes quotes and keeps preformatted text as is", () => {
    expect(
      htmlToText(
        "<ul><li>One</li><li>Two<ul><li>Nested</li></ul></li></ul>" +
          '<ol start="3"><li>Three</li><li>Four</li></ol>' +
          "<blockquote><p>Quoted one</p><p>Quoted two</p></blockquote>" +
          "<pre>line 1\n    indented\n\n\nline 5</pre><hr><p>End</p>",
      ),
    ).toBe(
      "- One\n- Two\n  - Nested\n\n3. Three\n4. Four\n\n> Quoted one\n>\n> Quoted two\n\n" +
        "line 1\n    indented\n\n\nline 5\n\n---\n\nEnd",
    );
  });

  test("puts table rows on lines and cells side by side", () => {
    expect(
      htmlToText(
        '<table role="presentation"><tr><td><table>' +
          "<tr><th>Item</th><th>Price</th></tr><tr><td>Widget</td><td>$10</td></tr>" +
          "</table></td></tr></table>",
      ),
    ).toBe("Item Price\nWidget $10");
  });

  test("leaves out hidden content, comments and spacer characters", () => {
    expect(
      htmlToText(
        '<div style="display: none; max-height: 0">Preheader &zwnj;&nbsp;&zwnj;&nbsp;</div>' +
          "<div hidden>Hidden</div><!--[if mso]><p>Outlook only</p><![endif]-->" +
          "<p>Hello&nbsp;&zwnj;&nbsp;&zwnj;world­​!</p>" +
          '<img src="https://t.example/o.gif" width="1" height="1" alt="">',
      ),
    ).toBe("Hello world!");
  });

  test("uses images' alt text and keeps a non-joiner between letters", () => {
    expect(htmlToText('<img alt="Acme"><p>می‌خواهم</p>')).toBe("Acme\n\nمی‌خواهم");
  });

  test("returns null when nothing readable is left", () => {
    expect(htmlToText('<p>&nbsp;</p><img src="banner.png">')).toBeNull();
    expect(htmlToText("<style>p {}</style>")).toBeNull();
  });
});
