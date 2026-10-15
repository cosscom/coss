/** React Email: `react` is rendered by the optional `@react-email/render` before the request. */
import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { Coss, type ReactEmailElement } from "../src/index.ts";
import { renderReactEmail } from "../src/react.ts";
import { json, mockFetch, sampleEmail } from "./helpers.ts";

const API_KEY = "coss_test_abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijkl";

function client(...handlers: Parameters<typeof mockFetch>) {
  const { fetch, calls } = mockFetch(...handlers);
  return { coss: new Coss({ apiKey: API_KEY, baseUrl: "https://api.test", fetch }), calls };
}

function Welcome({ name }: { name: string }) {
  return createElement(
    "html",
    null,
    createElement(
      "body",
      null,
      createElement("h1", null, `Welcome, ${name}!`),
      createElement("a", { href: "https://acme.com/start" }, "Get started"),
    ),
  );
}

function Broken(): never {
  throw new Error("missing prop");
}

const email = {
  from: "Acme <hello@acme.com>",
  to: "ada@example.com",
  subject: "Welcome",
};

describe("coss.email.send with react", () => {
  test("renders html and text, and never sends `react`", async () => {
    const { coss, calls } = client(json(202, sampleEmail));

    const result = await coss.email.send({
      ...email,
      react: createElement(Welcome, { name: "Ada" }),
    });

    expect(result.error).toBeNull();
    const body = JSON.parse(calls[0]?.body ?? "{}");
    expect(Object.keys(body).sort()).toEqual(["from", "html", "subject", "text", "to"]);
    expect(body.html).toStartWith("<!DOCTYPE html");
    expect(body.html).toContain("<h1>Welcome, Ada!</h1>");
    expect(body.text).toContain("WELCOME, ADA!");
    expect(body.text).toContain("Get started https://acme.com/start");
    expect(body.text).not.toContain("<");
  });

  test("keeps your own text", async () => {
    const { coss, calls } = client(json(202, sampleEmail));

    await coss.email.send({
      ...email,
      text: "Hi Ada",
      react: createElement(Welcome, { name: "Ada" }),
    });

    const body = JSON.parse(calls[0]?.body ?? "{}");
    expect(body.text).toBe("Hi Ada");
    expect(body.html).toContain("Welcome, Ada!");
  });

  test("refuses react with html before any request", async () => {
    const { coss, calls } = client(json(202, sampleEmail));

    const result = await coss.email.send({
      ...email,
      html: "<p>Hi</p>",
      react: createElement(Welcome, { name: "Ada" }),
    });

    expect(result.data).toBeNull();
    expect(result.error).toMatchObject({
      type: "invalid_request_error",
      code: "validation_error",
      param: "react",
      status: null,
      request_id: null,
    });
    expect(calls).toHaveLength(0);
  });

  test("refuses react with a template before any request", async () => {
    const { coss, calls } = client(json(202, sampleEmail));

    // Typed out (`react?: never` on template sends); plain JavaScript can still pass both.
    const params = {
      from: email.from,
      to: email.to,
      template_id: "welcome",
      react: createElement(Welcome, { name: "Ada" }),
    } as unknown as Parameters<typeof coss.email.send>[0];
    const result = await coss.email.send(params);

    expect(result.error).toMatchObject({
      type: "invalid_request_error",
      code: "validation_error",
      param: "react",
    });
    expect(calls).toHaveLength(0);
  });

  test("a component that throws comes back as an error, never thrown", async () => {
    const { coss, calls } = client(json(202, sampleEmail));

    const result = await coss.email.send({ ...email, react: createElement(Broken) });

    expect(result.error).toMatchObject({
      type: "invalid_request_error",
      code: "react_render_failed",
      param: "react",
    });
    expect(result.error?.message).toContain("missing prop");
    expect(calls).toHaveLength(0);
  });

  test("renders once: retries resend the same body", async () => {
    const { coss, calls } = client(json(503, {}), json(202, sampleEmail));

    const result = await coss.email.send({
      ...email,
      react: createElement(Welcome, { name: "Ada" }),
    });

    expect(result.error).toBeNull();
    expect(calls).toHaveLength(2);
    expect(calls[1]?.body).toBe(calls[0]?.body ?? "");
    expect(calls[1]?.headers.get("idempotency-key")).toBe(
      calls[0]?.headers.get("idempotency-key") ?? "",
    );
  });
});

describe("coss.email.sendBatch with react", () => {
  test("renders every email that has one", async () => {
    const { coss, calls } = client(json(202, { object: "email_batch", id: "batch_1", data: [] }));

    await coss.email.sendBatch([
      { ...email, react: createElement(Welcome, { name: "Ada" }) },
      { ...email, to: "grace@example.com", text: "Hi Grace" },
    ]);

    const { emails } = JSON.parse(calls[0]?.body ?? "{}");
    expect(emails[0].html).toContain("Welcome, Ada!");
    expect(emails[0].react).toBeUndefined();
    expect(emails[1]).toEqual({ ...email, to: "grace@example.com", text: "Hi Grace" });
  });

  test("a failure names the email and sends nothing", async () => {
    const { coss, calls } = client(json(202, {}));

    const result = await coss.email.sendBatch([
      { ...email, text: "Hi" },
      { ...email, react: createElement(Broken) },
    ]);

    expect(result.error).toMatchObject({ code: "react_render_failed", param: "emails.1.react" });
    expect(calls).toHaveLength(0);
  });
});

describe("renderReactEmail", () => {
  const element: ReactEmailElement = { type: "p", props: {}, key: null };

  test("without @react-email/render installed, says what to install", async () => {
    const result = await renderReactEmail({ ...email, react: element }, "react", async () => null);

    expect(result.error).toMatchObject({
      type: "invalid_request_error",
      code: "react_renderer_missing",
      param: "react",
    });
    expect(result.error?.message).toContain("@react-email/render");
  });

  test("renders text a second time with 1.x, which has no toPlainText", async () => {
    const calls: unknown[] = [];
    const result = await renderReactEmail({ ...email, react: element }, "react", async () => ({
      render: async (_node, options) => {
        calls.push(options);
        return options?.plainText ? "Hello" : "<p>Hello</p>";
      },
    }));

    expect(result.body).toEqual({ ...email, html: "<p>Hello</p>", text: "Hello" });
    expect(calls).toEqual([undefined, { plainText: true }]);
  });

  test("params without react pass through untouched", async () => {
    const result = await renderReactEmail({ ...email, html: "<p>Hi</p>" }, "react", async () => {
      throw new Error("never loaded");
    });

    expect(result).toEqual({ body: { ...email, html: "<p>Hi</p>" }, error: null });
  });
});
