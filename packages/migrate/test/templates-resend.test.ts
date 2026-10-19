import { describe, expect, test } from "bun:test";
import { convertResendTemplate } from "../src/templates/index.ts";
import { expectConsistent, messages } from "./templates-helpers.ts";

describe("Resend templates", () => {
  test("declared variables keep their type, fallback and whether they're required", () => {
    const result = convertResendTemplate({
      subject: "Your invoice, {{{FIRST_NAME|there}}}",
      html: '<p>Hi {{{FIRST_NAME|there}}},</p><p>You owe {{{AMOUNT}}} by {{{DUE_DATE}}}.</p><a href="{{{UNSUBSCRIBE_URL}}}">Unsubscribe</a>',
      text: "You owe {{{AMOUNT}}}. Unsubscribe: {{{RESEND_UNSUBSCRIBE_URL}}}",
      variables: [
        { key: "FIRST_NAME", type: "string", fallback_value: "there" },
        { key: "AMOUNT", type: "number" },
        { key: "DUE_DATE", type: "string", fallback_value: null },
        { key: "PLAN", type: "string", fallback_value: "Pro" },
        { key: "SEATS", type: "number", fallback_value: 3 },
      ],
    });
    expect(result.subject).toBe("Your invoice, {{FIRST_NAME}}");
    expect(result.html).toBe(
      '<p>Hi {{{FIRST_NAME}}},</p><p>You owe {{{AMOUNT}}} by {{{DUE_DATE}}}.</p><a href="{{{unsubscribe_url}}}">Unsubscribe</a>',
    );
    expect(result.text).toBe("You owe {{AMOUNT}}. Unsubscribe: {{{unsubscribe_url}}}");
    expect(result.variables).toEqual([
      { name: "FIRST_NAME", type: "string", required: false, default: "there" },
      { name: "AMOUNT", type: "number", required: true },
      { name: "DUE_DATE", type: "string", required: true },
      // Declared but unused: sends still pass them.
      { name: "PLAN", type: "string", required: false, default: "Pro" },
      { name: "SEATS", type: "number", required: false, default: 3 },
    ]);
    expect(result.renames).toEqual([]);
    expect(result.sampleVariables).toBeNull();
    expect(messages(result)).toEqual([
      "{{{FIRST_NAME}}} came from the contact in Resend: pass it when sending.",
      "{{{unsubscribe_url}}} is filled in on marketing sends only (transactional sends leave it empty).",
    ]);
    expect(result.lossless).toBe(true);
    expectConsistent(result);
  });

  const cases: { name: string; html: string; out: string; lossless: boolean; warning?: string }[] =
    [
      {
        name: "an undeclared variable is declared optional",
        html: "{{{NAME}}}",
        out: "{{{NAME}}}",
        lossless: true,
      },
      {
        name: "double braces too",
        html: "{{ NAME }}",
        out: "{{NAME}}",
        lossless: true,
      },
      {
        name: "a fallback written only in the tag",
        html: "{{{CITY|Berlin}}}",
        out: "{{{CITY}}}",
        lossless: true,
      },
      {
        name: "different fallbacks for one variable",
        html: "{{{CITY|Berlin}}} {{{CITY|Paris}}}",
        out: "{{{CITY}}} {{{CITY}}}",
        lossless: false,
        warning: `"CITY" has two different defaults: "Berlin" is used.`,
      },
      {
        name: "a tag that isn't a variable",
        html: "{{{#if x}}}",
        out: "{{{#if x}}}",
        lossless: false,
        warning: `Not converted: "#if x".`,
      },
      {
        name: "a name coss.com can't take",
        html: "{{{order-id}}}",
        out: "{{{order_id}}}",
        lossless: true,
      },
    ];

  for (const { name, html, out, lossless, warning } of cases) {
    test(name, () => {
      const result = convertResendTemplate({ subject: "Hi", html, text: null, variables: [] });
      expect(result.html).toBe(out);
      expect(result.lossless).toBe(lossless);
      if (warning) expect(messages(result)).toContain(warning);
      expectConsistent(result);
    });
  }

  test("a fallback that isn't a number for a number variable", () => {
    const result = convertResendTemplate({
      subject: "Hi",
      html: "{{{COUNT|many}}}",
      text: null,
      variables: [{ key: "COUNT", type: "number" }],
    });
    expect(result.variables).toEqual([{ name: "COUNT", type: "number", required: true }]);
    expect(messages(result)).toContain(`The default "many" of "COUNT" isn't a number.`);
    expect(result.lossless).toBe(false);
  });

  test("an unsubscribe link can't go in the subject", () => {
    const result = convertResendTemplate({
      subject: "{{{UNSUBSCRIBE_URL}}}",
      html: "<p>x</p>",
      text: null,
      variables: [],
    });
    expect(result.lossless).toBe(false);
    expect(messages(result)).toContain(
      "{{{unsubscribe_url}}} can only be used in the HTML and text.",
    );
    expectConsistent(result);
  });
});
