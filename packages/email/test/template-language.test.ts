import { describe, expect, test } from "bun:test";
import {
  canonicalLocale,
  checkTemplate,
  checkTemplateContents,
  parseTemplate,
  pickTemplateLocale,
  renderTemplate,
  renderTemplateContent,
  type TemplateField,
  type TemplateNode,
  TemplateRenderError,
  type TemplateValues,
  type TemplateVariable,
  templateNames,
  validateTemplateVariables,
} from "../src/template-language.ts";

function parse(source: string): TemplateNode[] {
  const parsed = parseTemplate(source);
  if (!parsed.ok) throw new Error(parsed.problem.message);
  return parsed.nodes;
}

function render(source: string, values: TemplateValues, field: TemplateField = "text"): string {
  return renderTemplate(parse(source), values, { field, variables: [] });
}

const VARIABLES: TemplateVariable[] = [
  { name: "first_name", type: "string", required: true },
  { name: "trial", type: "boolean", required: false },
  { name: "count", type: "number", required: false },
  {
    name: "items",
    type: "list",
    required: false,
    fields: [
      { name: "name", type: "string", required: true },
      { name: "price", type: "number", required: false },
    ],
  },
];

describe("parseTemplate", () => {
  test("parses variables, raw output, blocks, comments and escaped braces", () => {
    const source =
      "Hi {{ first_name }}{{! ignored }} \\{{literal}} {{{badge}}}" +
      "{{#if trial}}T{{else}}F{{/if}}{{#each items}}[{{name}}]{{else}}none{{/each}}";
    expect(parse(source)).toEqual([
      { kind: "text", value: "Hi " },
      { kind: "variable", name: "first_name", raw: false, line: 1, column: 4 },
      { kind: "text", value: " {{literal}} " },
      { kind: "variable", name: "badge", raw: true, line: 1, column: 48 },
      {
        kind: "if",
        name: "trial",
        body: [{ kind: "text", value: "T" }],
        otherwise: [{ kind: "text", value: "F" }],
        line: 1,
        column: 59,
      },
      {
        kind: "each",
        name: "items",
        body: [
          { kind: "text", value: "[" },
          { kind: "variable", name: "name", raw: false, line: 1, column: 105 },
          { kind: "text", value: "]" },
        ],
        otherwise: [{ kind: "text", value: "none" }],
        line: 1,
        column: 89,
      },
    ]);
  });

  test.each([
    ["Hi {{name", "Unclosed {{ tag: expected }}.", 1, 4],
    ["{{{raw}}", "Unclosed {{{ tag: expected }}}.", 1, 1],
    ["a\n  {{#if x}}", "Unclosed {{#if x}}: expected {{/if}}.", 2, 3],
    ["{{/if}}", "{{/if}} without a matching {{#if}}.", 1, 1],
    ["{{#if x}}{{/each}}", "Expected {{/if}} to close {{#if x}}, found {{/each}}.", 1, 10],
    ["{{else}}", "{{else}} outside of an {{#if}} or {{#each}} block.", 1, 1],
    ["{{#if x}}{{else}}{{else}}{{/if}}", "A {{#if}} block can have only one {{else}}.", 1, 18],
    ["{{#unless x}}{{/unless}}", "Unknown block {{#unless}}: use {{#if …}} or {{#each …}}.", 1, 1],
    ["{{#if a b}}{{/if}}", "{{#if}} takes one variable name.", 1, 1],
    ["{{user.name}}", '"user.name" is not a valid variable name', 1, 1],
    ["{{}}", "Expected a variable name.", 1, 1],
  ])("reports %j", (source, message, line, column) => {
    const parsed = parseTemplate(source);
    expect(parsed.ok).toBe(false);
    if (parsed.ok) return;
    expect(parsed.problem.message).toStartWith(message);
    expect(parsed.problem).toMatchObject({ line, column });
  });

  test("limits nesting depth", () => {
    const deep = (n: number) => "{{#if x}}".repeat(n) + "{{/if}}".repeat(n);
    expect(parseTemplate(deep(10)).ok).toBe(true);
    const parsed = parseTemplate(deep(11));
    expect(parsed.ok ? null : parsed.problem.message).toBe("Blocks can be nested at most 10 deep.");
  });

  test("positions problems on later lines, and parses many tags in linear time", () => {
    const parsed = parseTemplate("one\ntwo {{a}}\nthree\n  {{#if}}");
    expect(parsed.ok ? null : parsed.problem).toMatchObject({ line: 4, column: 3 });
    // 512 KB of tags, each on its own line: quadratic positioning took seconds here.
    const source = "{{x}}\n".repeat((512 * 1024) / 6);
    const started = performance.now();
    const many = parseTemplate(source);
    expect(many.ok).toBe(true);
    if (many.ok) expect(many.nodes.at(-2)).toMatchObject({ line: 87381, column: 1 });
    expect(performance.now() - started).toBeLessThan(1_000);
  });
});

describe("checkTemplate", () => {
  const check = (source: string, field: TemplateField = "html") =>
    checkTemplate(parse(source), VARIABLES, field).map((problem) => problem.message);

  test("accepts declared names, list fields inside #each and top-level names there too", () => {
    expect(
      check(
        "{{first_name}}{{#if trial}}{{count}}{{/if}}{{#each items}}{{name}}{{first_name}}{{/each}}",
      ),
    ).toEqual([]);
  });

  test("reports undeclared names, list fields outside their loop and misuse of lists", () => {
    expect(
      check("{{last_name}}{{name}}{{items}}{{#each trial}}{{/each}}{{#each items}}{{x}}{{/each}}"),
    ).toEqual([
      '"last_name" is not a declared variable.',
      '"name" is not a declared variable.',
      '"items" is a list: loop over it with {{#each items}}.',
      '"trial" is not a list.',
      '"x" is not a declared variable or a field of "items".',
    ]);
  });

  test("allows raw output only in HTML", () => {
    expect(check("{{{first_name}}}", "html")).toEqual([]);
    expect(check("{{{first_name}}}", "subject")).toEqual([
      "{{{first_name}}} is only allowed in HTML.",
    ]);
  });

  test("lists names in order of first use", () => {
    expect(templateNames(parse("{{b}}{{#each items}}{{name}}{{b}}{{/each}}{{a}}"))).toEqual([
      "b",
      "items",
      "name",
      "a",
    ]);
  });
});

describe("renderTemplate", () => {
  test("escapes variables in HTML only, and never raw output", () => {
    const values = { first_name: `<b>"Ada" & 'co'</b>\`` };
    expect(render("{{first_name}}", values, "html")).toBe(
      "&lt;b&gt;&quot;Ada&quot; &amp; &#39;co&#39;&lt;/b&gt;&#96;",
    );
    expect(render("{{{first_name}}}", values, "html")).toBe(values.first_name);
    expect(render("{{first_name}}", values, "text")).toBe(values.first_name);
    expect(render("{{first_name}}", values, "subject")).toBe(values.first_name);
  });

  test("renders scalars, missing values as nothing, and documented truthiness", () => {
    expect(render("{{n}}|{{b}}|{{missing}}|", { n: 1.5, b: false })).toBe("1.5|false||");
    const truthy = (value: TemplateValues[string] | undefined) =>
      render("{{#if v}}yes{{else}}no{{/if}}", value === undefined ? {} : { v: value });
    expect([truthy(undefined), truthy(false), truthy(""), truthy([])]).toEqual([
      "no",
      "no",
      "no",
      "no",
    ]);
    expect([truthy(0), truthy("x"), truthy(true), truthy([{}])]).toEqual([
      "yes",
      "yes",
      "yes",
      "yes",
    ]);
  });

  test("loops with item fields shadowing top-level names, and renders else for empty lists", () => {
    const source = "{{#each items}}{{name}}={{price}};{{/each}}{{name}}";
    expect(
      render(source, {
        name: "top",
        items: [{ name: "a", price: 1 }, { name: "b" }],
      }),
    ).toBe("a=1;b=;top");
    expect(render("{{#each items}}x{{else}}empty{{/each}}", { items: [] })).toBe("empty");
  });

  test("a declared item field shadows the top-level variable even when an item leaves it out", () => {
    const variables: TemplateVariable[] = [
      { name: "discount", type: "boolean", required: false },
      {
        name: "items",
        type: "list",
        required: false,
        fields: [
          { name: "name", type: "string", required: true },
          { name: "discount", type: "boolean", required: false },
        ],
      },
    ];
    const source =
      "{{#each items}}{{name}}{{#if discount}}%{{/if}};{{/each}}{{#if discount}}!{{/if}}";
    const validated = validateTemplateVariables(variables, {
      discount: true,
      items: [{ name: "a" }, { name: "b", discount: true }],
    });
    if (!validated.ok) throw new Error("invalid variables");
    expect(renderTemplate(parse(source), validated.values, { field: "text", variables })).toBe(
      "a;b%;!",
    );
  });

  test("stops rendering once the output passes the limit, so loops can't amplify", () => {
    const items = Array.from({ length: 1000 }, () => ({ name: "x".repeat(100) }));
    expect(() =>
      renderTemplate(
        parse("{{#each items}}{{#each items}}{{name}}{{/each}}{{/each}}"),
        { items },
        {
          field: "html",
          variables: [],
          maxLength: 1_000_000,
        },
      ),
    ).toThrow(TemplateRenderError);
  });

  test("stops nested loops that emit nothing once the work passes the step budget", () => {
    const items = Array.from({ length: 1000 }, () => ({}));
    const nested = `${"{{#each items}}".repeat(10)}${"{{/each}}".repeat(10)}`;
    const started = performance.now();
    expect(() =>
      renderTemplate(parse(nested), { items }, { field: "text", variables: [] }),
    ).toThrow("Rendering text takes too many steps");
    expect(performance.now() - started).toBeLessThan(1_000);
    // Ordinary loops stay well inside it.
    expect(render("{{#each items}}{{#if x}}y{{/if}}{{/each}}", { items })).toBe("");
  });
});

describe("validateTemplateVariables", () => {
  test("applies defaults, treats null as absent and keeps declared values", () => {
    const result = validateTemplateVariables(
      [
        { name: "a", type: "string", required: true },
        { name: "b", type: "number", required: true, default: 3 },
        { name: "c", type: "boolean", required: false },
      ],
      { a: "x", b: null },
    );
    expect(result).toEqual({ ok: true, values: { a: "x", b: 3 } });
  });

  test("reports unknown, missing and mistyped values with their paths", () => {
    const result = validateTemplateVariables(VARIABLES, {
      unknown: 1,
      trial: "yes",
      count: Number.NaN,
      items: [{ price: "1" }, 5, { name: "ok", extra: true }],
    });
    expect(result).toEqual({
      ok: false,
      issues: [
        { path: ["unknown"], message: 'The template declares no variable "unknown".' },
        { path: ["first_name"], message: "Required." },
        { path: ["trial"], message: "Expected true or false." },
        { path: ["count"], message: "Expected a number." },
        { path: ["items", 0, "name"], message: "Required." },
        { path: ["items", 0, "price"], message: "Expected a number." },
        { path: ["items", 1], message: "Expected an object." },
        { path: ["items", 2, "extra"], message: '"items" items have no field "extra".' },
      ],
    });
  });

  test("limits list length", () => {
    const result = validateTemplateVariables(VARIABLES, {
      first_name: "a",
      items: Array.from({ length: 1001 }, () => ({ name: "x" })),
    });
    expect(result.ok ? [] : result.issues).toEqual([
      { path: ["items"], message: "A list can have at most 1000 items." },
    ]);
  });
});

describe("locales", () => {
  test("canonicalizes BCP 47 tags", () => {
    expect(canonicalLocale("en-us")).toBe("en-US");
    expect(canonicalLocale("PT")).toBe("pt");
    expect(canonicalLocale("not a locale")).toBeNull();
  });

  test("picks an exact match, then the language, then the default", () => {
    const available = ["en", "de", "pt-BR"];
    expect(pickTemplateLocale(available, "pt-br", "en")).toBe("pt-BR");
    expect(pickTemplateLocale(available, "de-AT", "en")).toBe("de");
    expect(pickTemplateLocale(available, "fr", "en")).toBe("en");
    expect(pickTemplateLocale(available, "pt-PT", "en")).toBe("en");
    expect(pickTemplateLocale(available, undefined, "en")).toBe("en");
  });
});

describe("contents", () => {
  test("checks every field of every locale", () => {
    expect(
      checkTemplateContents(
        [
          { locale: "en", subject: "Hi {{first_name}}", html: "{{#if x}}", text: null },
          { locale: "de", subject: "{{{first_name}}}", html: null, text: "{{nope}}" },
        ],
        VARIABLES,
      ),
    ).toEqual([
      {
        locale: "en",
        field: "html",
        message: "Unclosed {{#if x}}: expected {{/if}}.",
        line: 1,
        column: 1,
      },
      {
        locale: "de",
        field: "subject",
        message: "{{{first_name}}} is only allowed in HTML.",
        line: 1,
        column: 1,
      },
      {
        locale: "de",
        field: "text",
        message: '"nope" is not a declared variable.',
        line: 1,
        column: 1,
      },
    ]);
  });

  test("renders each field, and refuses one that doesn't parse", () => {
    expect(
      renderTemplateContent(
        { subject: "Hi {{n}}", html: "<p>{{n}}</p>", text: null },
        { n: "<Ada>" },
        [],
      ),
    ).toEqual({ subject: "Hi <Ada>", html: "<p>&lt;Ada&gt;</p>", text: null });
    expect(() => renderTemplateContent({ subject: "{{", html: null, text: "x" }, {}, [])).toThrow(
      "subject (line 1, column 1): Unclosed {{ tag: expected }}.",
    );
  });
});
