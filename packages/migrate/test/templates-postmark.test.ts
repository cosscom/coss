import { describe, expect, test } from "bun:test";
import { convertPostmarkTemplate } from "../src/templates/index.ts";
import { expectConsistent, messages } from "./templates-helpers.ts";

const LAYOUT = {
  html: '<html><body><div class="content">{{{ @content }}}</div><footer>{{company_name}} · <a href="{{{ pm:unsubscribe }}}">Unsubscribe</a></footer></body></html>',
  text: "{{{ @content }}}\n--\n{{company_name}}",
};

describe("Postmark templates", () => {
  test("a welcome email: layout inlined, sections decided by the suggested model", () => {
    const result = convertPostmarkTemplate({
      subject: "Welcome to {{product_name}}, {{name}}!",
      html: [
        "<h1>Welcome, {{name}}!</h1>",
        "{{#trial}}<p>Your trial ends {{trial_end_date}}.</p>{{/trial}}",
        "{{^trial}}<p>Thanks for subscribing.</p>{{/trial}}",
        "{{#account}}<p>Sign in as {{username}} at {{login_url}}</p>{{/account}}",
        "{{#each steps}}<li>{{title}}: {{../product_name}}</li>{{/each}}",
      ].join("\n"),
      text: "Welcome, {{name}}! Sign in at {{account.login_url}}",
      layout: LAYOUT,
      suggestedModel: {
        product_name: "Acme",
        name: "Ada",
        trial: true,
        trial_end_date: "May 1",
        account: { username: "ada", login_url: "https://acme.test" },
        steps: [{ title: "Verify" }],
        company_name: "Acme Inc.",
      },
    });
    expect(result.subject).toBe("Welcome to {{product_name}}, {{name}}!");
    expect(result.html).toBe(
      [
        '<html><body><div class="content"><h1>Welcome, {{name}}!</h1>',
        "{{#if trial}}<p>Your trial ends {{trial_end_date}}.</p>{{/if}}",
        "{{#if trial}}{{else}}<p>Thanks for subscribing.</p>{{/if}}",
        "<p>Sign in as {{account_username}} at {{account_login_url}}</p>",
        '{{#each steps}}<li>{{title}}: {{product_name}}</li>{{/each}}</div><footer>{{company_name}} · <a href="{{{unsubscribe_url}}}">Unsubscribe</a></footer></body></html>',
      ].join("\n"),
    );
    expect(result.text).toBe(
      "Welcome, {{name}}! Sign in at {{account_login_url}}\n--\n{{company_name}}",
    );
    expect(result.variables.map((variable) => [variable.name, variable.type])).toEqual([
      ["product_name", "string"],
      ["name", "string"],
      ["trial", "boolean"],
      ["trial_end_date", "string"],
      ["account_username", "string"],
      ["account_login_url", "string"],
      ["steps", "list"],
      ["company_name", "string"],
    ]);
    expect(result.renames).toEqual([
      { from: "account.username", to: "account_username" },
      { from: "account.login_url", to: "account_login_url" },
    ]);
    expect(result.sampleVariables).toMatchObject({
      account_username: "ada",
      steps: [{ title: "Verify" }],
    });
    expect(messages(result)).toEqual([
      `"account" is an object: its fields became separate variables, shown even when it's missing.`,
      "{{{unsubscribe_url}}} is filled in on marketing sends only (transactional sends leave it empty).",
    ]);
    expect(result.lossless).toBe(false);
    expectConsistent(result);
  });

  const cases: {
    name: string;
    html: string;
    model?: unknown;
    out: string;
    lossless: boolean;
    warning?: string;
  }[] = [
    {
      name: "a section over a list loops",
      html: "{{#items}}{{name}}{{/items}}",
      model: { items: [{ name: "x" }] },
      out: "{{#each items}}{{name}}{{/each}}",
      lossless: true,
    },
    {
      name: "a section without sample data is a condition",
      html: "{{#show}}yes{{/show}}",
      out: "{{#if show}}yes{{/if}}",
      lossless: true,
    },
    {
      name: "{{& x}} is raw output",
      html: "{{& signature}}",
      out: "{{{signature}}}",
      lossless: true,
    },
    {
      name: "a name the item doesn't have is the outer one's",
      html: "{{#each rows}}{{label}} {{currency}}{{/each}}",
      model: { currency: "EUR", rows: [{ label: "a" }] },
      out: "{{#each rows}}{{label}} {{currency}}{{/each}}",
      lossless: true,
    },
    {
      name: "{{.}} in a list of plain values",
      html: "{{#each tags}}{{.}}{{/each}}",
      model: { tags: ["a"] },
      out: "{{#each tags}}{{value}}{{/each}}",
      lossless: false,
      warning: `Lists of plain values become lists of objects: each item's value is its "value" field.`,
    },
    {
      name: "pm:unsubscribe outside a link becomes one",
      html: "<p>{{{ pm:unsubscribe }}}</p>",
      out: '<p><a href="{{{unsubscribe_url}}}">Unsubscribe</a></p>',
      lossless: true,
    },
    {
      name: "a number tested in a section",
      html: "{{#count}}{{count}} new{{/count}}",
      model: { count: 3 },
      out: "{{#if count}}{{count}} new{{/if}}",
      lossless: false,
      warning: `"count" is a number: coss.com treats 0 as true in {{#if}}.`,
    },
    {
      name: "partials",
      html: "{{> footer}}",
      out: "{{> footer}}",
      lossless: false,
      warning: "Not converted: partials.",
    },
    {
      name: "mismatched sections",
      html: "{{#a}}x{{/b}}",
      out: "{{#a}}x{{/b}}",
      lossless: false,
      warning: "Not converted: the template doesn't parse (Unexpected {{/b}}.)",
    },
    {
      name: "@content outside a layout",
      html: "{{{ @content }}}",
      out: "{{{ @content }}}",
      lossless: false,
      warning: "Not converted: @content has no coss.com equivalent.",
    },
  ];

  for (const { name, html, model, out, lossless, warning } of cases) {
    test(name, () => {
      const result = convertPostmarkTemplate({
        subject: "Hi",
        html,
        text: null,
        suggestedModel: model,
      });
      expect(result.html).toBe(out);
      expect(result.lossless).toBe(lossless);
      if (warning) expect(messages(result)).toContain(warning);
      expectConsistent(result);
    });
  }

  test("a layout without @content is left out", () => {
    const result = convertPostmarkTemplate({
      subject: "Hi",
      html: "<p>Body</p>",
      text: null,
      layout: { html: "<div>no slot</div>", text: null },
    });
    expect(result.html).toBe("<p>Body</p>");
    expect(messages(result)).toEqual(["The layout has no {{{ @content }}}: it was left out."]);
    expect(result.lossless).toBe(false);
  });

  test("a template without a text body gets none from its layout", () => {
    const result = convertPostmarkTemplate({
      subject: "Hi",
      html: "<p>x</p>",
      text: null,
      layout: LAYOUT,
    });
    expect(result.text).toBeNull();
  });
});
