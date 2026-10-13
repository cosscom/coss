import { describe, expect, test } from "bun:test";
import type * as PageTree from "fumadocs-core/page-tree";
import { activeRoot, allGroups, groupsOf, navGroups, pagesOf } from "../src/lib/docs-tree";

const page = (name: string, url: string): PageTree.Item => ({ type: "page", name, url });

const guides: PageTree.Folder = {
  type: "folder",
  name: "Guides",
  root: true,
  index: page("Introduction", "/docs"),
  children: [
    page("Introduction", "/docs"),
    page("Quickstart", "/docs/quickstart"),
    { type: "separator", name: "Concepts" },
    page("Environments", "/docs/environments"),
    { type: "separator", name: "Email" },
    {
      type: "folder",
      name: "Email",
      children: [page("Sending", "/docs/email/sending"), page("Domains", "/docs/email/domains")],
    },
  ],
};

const reference: PageTree.Folder = {
  type: "folder",
  name: "API Reference",
  root: true,
  index: page("Overview", "/docs/api-reference"),
  children: [
    { type: "separator", name: "Endpoints" },
    {
      type: "folder",
      name: "Emails",
      children: [page("Send an email", "/docs/api-reference/emails/send-email")],
    },
  ],
};

const tree: PageTree.Root = { name: "Docs", children: [guides, reference] };

describe("groupsOf", () => {
  test("splits a root into its leading pages, separators and nested folders", () => {
    expect(groupsOf(guides)).toEqual([
      {
        key: "/docs",
        label: "Guides",
        pages: [page("Introduction", "/docs"), page("Quickstart", "/docs/quickstart")],
      },
      {
        key: "/docs/environments",
        label: "Concepts",
        pages: [page("Environments", "/docs/environments")],
      },
      {
        key: "/docs/email/sending",
        label: "Email",
        pages: [page("Sending", "/docs/email/sending"), page("Domains", "/docs/email/domains")],
      },
    ]);
  });

  test("drops a separator that only introduces folders", () => {
    expect(groupsOf(reference).map((group) => group.label)).toEqual(["API Reference", "Emails"]);
  });
});

test("pagesOf flattens nested folders without repeating the index", () => {
  expect(pagesOf(guides).map((item) => item.url)).toEqual([
    "/docs",
    "/docs/quickstart",
    "/docs/environments",
    "/docs/email/sending",
    "/docs/email/domains",
  ]);
});

describe("a tree without root folders (Shipyard's docs)", () => {
  const flat: PageTree.Root = {
    name: "Shipyard",
    children: [
      { type: "folder", name: "Overview", children: [page("Introduction", "/shipyard/docs")] },
      {
        type: "folder",
        name: "Guides",
        children: [page("Runs", "/shipyard/docs/guides/runs")],
      },
    ],
  };

  test("is one root: every folder is a sidebar group on every page", () => {
    const labels = (groups: { label: unknown }[]) => groups.map((group) => group.label);
    expect(labels(navGroups(flat, "/shipyard/docs/guides/runs"))).toEqual(["Overview", "Guides"]);
    expect(labels(navGroups(flat, "/shipyard/docs"))).toEqual(["Overview", "Guides"]);
    expect(labels(allGroups(flat))).toEqual(["Overview", "Guides"]);
  });

  test("coss's docs show only the current root", () => {
    expect(navGroups(tree, "/docs/api-reference").map((group) => group.label)).toEqual([
      "API Reference",
      "Emails",
    ]);
    expect(allGroups(tree).map((group) => group.label)).toEqual([
      "Guides",
      "Concepts",
      "Email",
      "API Reference",
      "Emails",
    ]);
  });
});

describe("activeRoot", () => {
  test("picks the root holding the page", () => {
    expect(activeRoot(tree, "/docs/api-reference/emails/send-email")?.name).toBe("API Reference");
    expect(activeRoot(tree, "/docs/email/domains")?.name).toBe("Guides");
    expect(activeRoot(tree, "/docs")?.name).toBe("Guides");
  });

  test("falls back to the first root", () => {
    expect(activeRoot(tree, "/docs/nowhere")?.name).toBe("Guides");
  });
});
