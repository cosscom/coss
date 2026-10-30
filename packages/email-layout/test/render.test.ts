import { describe, expect, test } from "bun:test";
import { renderEmail } from "../src/index.ts";

describe("renderEmail", () => {
  test("escapes customer text in the HTML and keeps subjects on one line", () => {
    const message = renderEmail({
      subject: "Hello <b>Acme</b>\nInc",
      blocks: [
        { paragraph: '<script>alert("x")</script>' },
        { button: { label: "Go", url: "https://coss.test/?a=1&b=2" } },
        {
          steps: [
            { label: "Submitted", state: "done" },
            { label: "Review", detail: "A few days", state: "current" },
            { label: "Sending", state: "upcoming" },
          ],
        },
        { details: [{ label: "Number", value: "+18005550100" }] },
      ],
      reason: "Because.",
    });
    expect(message.subject).toBe("Hello <b>Acme</b> Inc");
    expect(message.html).not.toContain("<script>");
    expect(message.html).toContain("&lt;script&gt;");
    expect(message.html).toContain('href="https://coss.test/?a=1&amp;b=2"');
    expect(message.text).toContain("Go: https://coss.test/?a=1&b=2");
    expect(message.text).toContain("[x] 1. Submitted\n[>] 2. Review (A few days)\n[ ] 3. Sending");
    expect(message.text).toContain("Number: +18005550100");
    expect(message.text).toEndWith("--\nBecause.");
  });
});
