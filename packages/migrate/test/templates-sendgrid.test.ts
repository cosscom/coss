import { describe, expect, test } from "bun:test";
import { convertSendGridTemplate } from "../src/templates/index.ts";
import { expectConsistent, messages, publishProblems } from "./templates-helpers.ts";

const dynamic = (html: string, testData?: unknown, subject = "Hello") =>
  convertSendGridTemplate({ generation: "dynamic", subject, html, text: null, testData });

describe("SendGrid dynamic templates", () => {
  test("a receipt: paths flattened, loops, defaults, unsupported helpers left for review", () => {
    const result = convertSendGridTemplate({
      generation: "dynamic",
      subject: "Receipt {{{order.number}}}",
      html: [
        `<p>Hi {{insert customer.first_name "default=there"}},</p>`,
        "{{#each items}}<tr><td>{{this.name}}</td><td>{{qty}}</td><td>{{price}} {{../currency}}</td></tr>{{else}}<tr><td>Nothing</td></tr>{{/each}}",
        "{{#if discount}}<p>You saved {{discount}}</p>{{/if}}",
        `<p>Ordered {{formatDate ordered_at "MMMM D"}}</p>`,
        `<a href="{{{unsubscribe}}}">Unsubscribe</a>`,
      ].join("\n"),
      text: "Receipt {{order.number}}: {{total}}",
      testData: JSON.stringify({
        order: { number: 1042 },
        customer: { first_name: "Ada" },
        items: [{ name: "Mug", qty: 2, price: 12.5, sku: "MUG-1" }],
        currency: "EUR",
        discount: 5,
        ordered_at: "2024-05-01",
        total: "30.00",
      }),
    });
    expect(result.subject).toBe("Receipt {{order_number}}");
    expect(result.html).toBe(
      [
        "<p>Hi {{customer_first_name}},</p>",
        "{{#each items}}<tr><td>{{name}}</td><td>{{qty}}</td><td>{{price}} {{currency}}</td></tr>{{else}}<tr><td>Nothing</td></tr>{{/each}}",
        "{{#if discount}}<p>You saved {{discount}}</p>{{/if}}",
        `<p>Ordered {{formatDate ordered_at "MMMM D"}}</p>`,
        `<a href="{{{unsubscribe_url}}}">Unsubscribe</a>`,
      ].join("\n"),
    );
    expect(result.text).toBe("Receipt {{order_number}}: {{total}}");
    expect(result.variables).toEqual([
      { name: "order_number", type: "number", required: false },
      { name: "customer_first_name", type: "string", required: false, default: "there" },
      {
        name: "items",
        type: "list",
        required: false,
        fields: [
          { name: "name", type: "string", required: false },
          { name: "qty", type: "number", required: false },
          { name: "price", type: "number", required: false },
          { name: "sku", type: "string", required: false },
        ],
      },
      { name: "currency", type: "string", required: false },
      { name: "discount", type: "number", required: false },
      { name: "total", type: "string", required: false },
    ]);
    expect(result.renames).toEqual([
      { from: "order.number", to: "order_number" },
      { from: "customer.first_name", to: "customer_first_name" },
    ]);
    expect(result.sampleVariables).toEqual({
      order_number: 1042,
      customer_first_name: "Ada",
      items: [{ name: "Mug", qty: 2, price: 12.5, sku: "MUG-1" }],
      currency: "EUR",
      discount: 5,
      total: "30.00",
    });
    expect(result.warnings).toEqual([
      {
        field: "html",
        line: 3,
        column: 1,
        message: `"discount" is a number: coss.com treats 0 as true in {{#if}}.`,
      },
      {
        field: "html",
        line: 4,
        column: 12,
        message: `Not converted: the helper "formatDate".`,
      },
      {
        field: "html",
        line: 5,
        column: 10,
        message:
          "{{{unsubscribe_url}}} is filled in on marketing sends only (transactional sends leave it empty).",
      },
    ]);
    expect(result.lossless).toBe(false);
    // The helper is left as written, so the draft won't publish until it's rewritten.
    expect(publishProblems(result).map((problem) => problem.field)).toEqual(["html"]);
  });

  const cases: {
    name: string;
    html: string;
    data?: unknown;
    out: string;
    lossless: boolean;
    warning?: string;
  }[] = [
    {
      name: "plain variables and raw HTML",
      html: "<p>{{name}}</p>{{{signature}}}",
      out: "<p>{{name}}</p>{{{signature}}}",
      lossless: true,
    },
    {
      name: "unless with else",
      html: "{{#unless paid}}Pay{{else}}Thanks{{/unless}}",
      out: "{{#if paid}}Thanks{{else}}Pay{{/if}}",
      lossless: true,
    },
    {
      name: "inverse sections",
      html: "{{^items}}Empty{{/items}}",
      out: "{{#if items}}{{else}}Empty{{/if}}",
      lossless: true,
    },
    {
      name: "else if chains",
      html: "{{#if a}}A{{else if b}}B{{else if c}}C{{else}}D{{/if}}",
      out: "{{#if a}}A{{else}}{{#if b}}B{{else}}{{#if c}}C{{else}}D{{/if}}{{/if}}{{/if}}",
      lossless: true,
    },
    {
      name: "with blocks unwrapped",
      html: "{{#with user}}{{name}} ({{email}}){{/with}}",
      out: "{{user_name}} ({{user_email}})",
      lossless: false,
      warning: `"user" is an object: its fields became separate variables, shown even when it's missing.`,
    },
    {
      name: "@root and ../ inside loops",
      html: "{{#each rows}}{{label}} {{@root.title}} {{../title}}{{/each}}",
      out: "{{#each rows}}{{label}} {{title}} {{title}}{{/each}}",
      lossless: true,
    },
    {
      name: "a top-level name an item field shadows",
      html: "{{#each rows}}{{name}} {{../name}}{{/each}}",
      out: "{{#each rows}}{{name}} {{name}}{{/each}}",
      lossless: false,
      warning: `Inside the loop over "rows", "name" is the item's field, not the top-level variable.`,
    },
    {
      name: "lists of plain values",
      html: "{{#each tags}}<i>{{this}}</i>{{/each}}",
      data: { tags: ["a", "b"] },
      out: "{{#each tags}}<i>{{value}}</i>{{/each}}",
      lossless: false,
      warning: `Lists of plain values become lists of objects: each item's value is its "value" field.`,
    },
    {
      name: "@index",
      html: "{{#each rows}}{{@index}}{{/each}}",
      out: "{{#each rows}}{{@index}}{{/each}}",
      lossless: false,
      warning: "Not converted: @index has no coss.com equivalent.",
    },
    {
      name: "loops inside loops",
      html: "{{#each orders}}{{#each lines}}{{sku}}{{/each}}{{/each}}",
      out: "{{#each orders}}{{#each lines}}{{sku}}{{/each}}{{/each}}",
      lossless: false,
      warning: "Not converted: a loop inside a loop (list items can't hold lists).",
    },
    {
      name: "comparison helpers keep their content converted",
      html: `{{#equals plan "pro"}}Pro {{user.name}}{{else}}Free{{/equals}}`,
      out: `{{#equals plan "pro"}}Pro {{user_name}}{{else}}Free{{/equals}}`,
      lossless: false,
      warning: `Not converted: the block helper "equals".`,
    },
    {
      name: "sub-expressions",
      html: "{{#if (gt count 1)}}many{{/if}}",
      out: "{{#if (gt count 1)}}many{{/if}}",
      lossless: false,
      warning: "Not converted: {{#if}} with a sub-expression.",
    },
    {
      name: "partials",
      html: "{{> footer}}",
      out: "{{> footer}}",
      lossless: false,
      warning: "Not converted: partials.",
    },
    {
      name: "comments, escapes and whitespace control",
      html: "{{!-- hidden }} --}}{{! short }}\\{{literal}} {{~name~}}",
      out: "\\{{literal}} {{name}}",
      lossless: true,
      warning: "Whitespace control (~) was removed: spacing may differ.",
    },
    {
      name: "names coss.com can't take",
      html: "{{first-name}} {{this}} {{else_}}",
      out: "{{first_name}} {{this}} {{else_}}",
      lossless: false,
      warning: "Not converted: The whole data object can't be printed.",
    },
    {
      name: "testing an object",
      html: "{{#if user}}hi{{/if}}",
      data: { user: { name: "x" } },
      out: "{{#if user}}hi{{/if}}",
      lossless: false,
      warning: `"user" is an object in the sample data: {{#if}} can't test one.`,
    },
    {
      name: "the sender's address",
      html: "<p>{{Sender_Name}} {{Sender_Address}}</p>",
      out: "<p> {{{mailing_address}}}</p>",
      lossless: false,
      warning:
        "{{Sender_Name}} was removed: coss.com prints the whole postal address as {{{mailing_address}}}.",
    },
    {
      name: "unsubscribe substitutions",
      html: `<a href="<%asm_group_unsubscribe_raw_url%>">x</a><a href="<%asm_preferences_raw_url%>">y</a>`,
      out: `<a href="{{{unsubscribe_url}}}">x</a><a href="{{{preferences_url}}}">y</a>`,
      lossless: true,
    },
    {
      name: "a template that doesn't parse",
      html: "{{#if a}}open",
      out: "{{#if a}}open",
      lossless: false,
      warning: "Not converted: the template doesn't parse (Unclosed {{#if}}.)",
    },
  ];

  for (const { name, html, data, out, lossless, warning } of cases) {
    test(name, () => {
      const result = dynamic(html, data);
      expect(result.html).toBe(out);
      expect(result.lossless).toBe(lossless);
      if (warning) expect(messages(result)).toContain(warning);
      expectConsistent(result);
    });
  }

  test("variable names are unique, and coss.com's placeholders are kept free", () => {
    const result = dynamic("{{a.b}} {{a_b}} {{unsubscribe_url}}");
    expect(result.html).toBe("{{a_b}} {{a_b_2}} {{unsubscribe_url_2}}");
    expect(result.renames).toEqual([
      { from: "a.b", to: "a_b" },
      { from: "a_b", to: "a_b_2" },
      { from: "unsubscribe_url", to: "unsubscribe_url_2" },
    ]);
    expectConsistent(result);
  });

  test("raw output in the subject and text is printed as is", () => {
    const result = convertSendGridTemplate({
      generation: "dynamic",
      subject: "{{{title}}}",
      html: null,
      text: "{{{title}}} {{& body}}",
    });
    expect(result.subject).toBe("{{title}}");
    expect(result.text).toBe("{{title}} {{body}}");
    expect(result.lossless).toBe(true);
    expectConsistent(result);
  });

  test("an inline default only stays lossless when every use has it", () => {
    const everywhere = dynamic(
      `<p>{{insert name "default=friend"}} / {{insert name "default=friend"}}</p>`,
    );
    expect(everywhere.lossless).toBe(true);
    expect(everywhere.variables).toEqual([
      { name: "name", type: "string", required: false, default: "friend" },
    ]);
    // The default would now fill the bare use too (and make the condition true).
    for (const html of [
      `<p>{{insert name "default=friend"}} {{name}}</p>`,
      `<p>{{insert name "default=friend"}}{{#if name}}!{{/if}}</p>`,
    ]) {
      const mixed = dynamic(html);
      expect(mixed.lossless).toBe(false);
      expect(messages(mixed)).toContain(
        `"name" has a default ("friend") at one use only: on coss.com it applies to every use.`,
      );
    }
  });

  test("a missing subject gets a placeholder", () => {
    const result = dynamic("<p>Hi</p>", undefined, "");
    expect(result.subject).toBe("(no subject)");
    expect(result.lossless).toBe(false);
    expect(result.warnings[0]).toMatchObject({ field: "subject", line: 1, column: 1 });
  });

  test("more variables than coss.com allows", () => {
    const html = Array.from({ length: 55 }, (_, i) => `{{v${i}}}`).join(" ");
    const result = dynamic(html);
    expect(result.variables).toHaveLength(50);
    expect(result.lossless).toBe(false);
    expect(messages(result)).toContain("The template uses 55 variables; coss.com allows 50.");
  });

  test("sample data of the wrong shape is ignored", () => {
    for (const testData of ["not json", "[1,2]", 42, null]) {
      const result = dynamic("{{a}}", testData);
      expect(result.sampleVariables).toBeNull();
      expect(result.variables).toEqual([{ name: "a", type: "string", required: false }]);
    }
  });
});

describe("SendGrid legacy templates", () => {
  test("are imported as drafts with <%body%> and <%subject%> as variables", () => {
    const result = convertSendGridTemplate({
      generation: "legacy",
      subject: "<%subject%>",
      html: "<div>Hi -name-, {{not handlebars}}</div><%body%>",
      text: "<%body%>",
    });
    expect(result.subject).toBe("{{subject}}");
    expect(result.html).toBe("<div>Hi -name-, \\{{not handlebars}}</div>{{{body}}}");
    expect(result.text).toBe("{{body}}");
    expect(result.variables).toEqual([
      { name: "subject", type: "string", required: false },
      { name: "body", type: "string", required: false },
    ]);
    expect(result.lossless).toBe(false);
    expect(messages(result)[0]).toStartWith("A legacy template");
    expect(publishProblems(result)).toEqual([]);
  });
});

describe("SendGrid sections", () => {
  test("a block named after a value loops, enters or tests by the sample data", () => {
    const result = dynamic(
      "{{#items}}{{name}}{{/items}}{{#user}}{{email}}{{/user}}{{#vip}}VIP{{/vip}}",
      { items: [{ name: "a" }], user: { email: "e" }, vip: true },
    );
    expect(result.html).toBe("{{#each items}}{{name}}{{/each}}{{user_email}}{{#if vip}}VIP{{/if}}");
    expectConsistent(result);
  });
});
