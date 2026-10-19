import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import spec from "@coss/api/openapi.json";
import type * as PageTree from "fumadocs-core/page-tree";
import {
  activeRoot,
  activeSection,
  allGroups,
  groupsOf,
  navGroups,
  neighbours,
  pagesOf,
  sectionsOf,
} from "../src/lib/docs-tree";
import { kebabCase } from "../src/lib/kebab-case";

const page = (name: string, url: string): PageTree.Item => ({ type: "page", name, url });

const start: PageTree.Folder = {
  type: "folder",
  name: "Get started",
  root: true,
  icon: "Rocket",
  description: "Your first email.",
  index: page("Introduction", "/docs"),
  children: [page("Introduction", "/docs"), page("Quickstart", "/docs/quickstart")],
};

const email: PageTree.Folder = {
  type: "folder",
  name: "Email",
  root: true,
  children: [
    { type: "separator", name: "Sending" },
    page("Sending email", "/docs/email/sending"),
    page("Templates", "/docs/email/templates"),
    { type: "separator", name: "Deliverability" },
    page("Domains", "/docs/email/domains"),
  ],
};

const hooks: PageTree.Folder = {
  type: "folder",
  name: "Hooks",
  root: true,
  children: [page("Hooks", "/docs/hooks"), page("Portal", "/docs/hooks/portal")],
};

const reference: PageTree.Folder = {
  type: "folder",
  name: "API reference",
  root: true,
  index: page("Overview", "/docs/api-reference"),
  children: [
    page("Overview", "/docs/api-reference"),
    { type: "separator", name: "Email" },
    {
      type: "folder",
      name: "Emails",
      children: [
        page("List emails", "/docs/api-reference/emails/list-emails"),
        page("Send an email", "/docs/api-reference/emails/send-email"),
      ],
    },
    { type: "separator", name: "Hooks" },
    {
      type: "folder",
      name: "Hooks applications",
      children: [page("Create an application", "/docs/api-reference/hooks-applications/create")],
    },
    { type: "separator", name: "Risk" },
    {
      type: "folder",
      name: "Risk",
      children: [page("Assess an event", "/docs/api-reference/risk/assess")],
    },
  ],
};

const tree: PageTree.Root = { name: "Docs", children: [start, email, hooks, reference] };

const labels = (groups: { label: unknown }[]) => groups.map((group) => group.label);

describe("groupsOf", () => {
  test("leads with the unlabelled index and pages, then one group per separator", () => {
    expect(groupsOf(start).map(({ label, pages }) => ({ label, pages }))).toEqual([
      {
        label: "",
        pages: [
          { name: "Introduction", url: "/docs" },
          { name: "Quickstart", url: "/docs/quickstart" },
        ],
      },
    ]);
    expect(labels(groupsOf(email))).toEqual(["Sending", "Deliverability"]);
  });

  test("names a page called like its section Overview", () => {
    expect(groupsOf(hooks)[0]?.pages.map((item) => item.name)).toEqual(["Overview", "Portal"]);
  });

  test("keeps folders under a separator as entries, named without the group's name", () => {
    const groups = groupsOf(reference);
    expect(labels(groups)).toEqual(["", "Email", "Hooks", "Risk"]);
    const names = groups
      .slice(1)
      .map((group) => group.entries.map((entry) => (entry.type === "folder" ? entry.name : null)));
    expect(names).toEqual([["Emails"], ["Applications"], ["Endpoints"]]);
    expect(groups[1]?.pages.map((item) => item.url)).toEqual([
      "/docs/api-reference/emails/list-emails",
      "/docs/api-reference/emails/send-email",
    ]);
  });

  test("doesn't repeat an index meta.json places itself", () => {
    expect(groupsOf(reference)[0]?.pages.map((item) => item.url)).toEqual(["/docs/api-reference"]);
  });
});

test("pagesOf flattens nested folders without repeating the index", () => {
  expect(pagesOf(reference).map((item) => item.url)).toEqual([
    "/docs/api-reference",
    "/docs/api-reference/emails/list-emails",
    "/docs/api-reference/emails/send-email",
    "/docs/api-reference/hooks-applications/create",
    "/docs/api-reference/risk/assess",
  ]);
});

describe("sections", () => {
  test("one per root, starting at its index or first page", () => {
    expect(
      sectionsOf(tree).map(({ name, url, icon, description }) => ({
        name,
        url,
        icon,
        description,
      })),
    ).toEqual([
      { name: "Get started", url: "/docs", icon: "Rocket", description: "Your first email." },
      { name: "Email", url: "/docs/email/sending", icon: undefined, description: undefined },
      { name: "Hooks", url: "/docs/hooks", icon: undefined, description: undefined },
      {
        name: "API reference",
        url: "/docs/api-reference",
        icon: undefined,
        description: undefined,
      },
    ]);
  });

  test("the sidebar shows only the current section", () => {
    expect(activeSection(tree, "/docs/email/domains")?.name).toBe("Email");
    expect(labels(navGroups(tree, "/docs/email/domains"))).toEqual(["Sending", "Deliverability"]);
    expect(activeSection(tree, "/docs/api-reference/risk/assess")?.name).toBe("API reference");
  });

  test("the command menu labels every group with its section", () => {
    expect(labels(allGroups(tree))).toEqual([
      "Get started",
      "Email · Sending",
      "Email · Deliverability",
      "Hooks",
      "API reference",
      "API reference · Email",
      "API reference · Hooks",
      "API reference · Risk",
    ]);
  });

  test("previous and next stay inside the section", () => {
    const urls = (around: ReturnType<typeof neighbours>) => ({
      previous: around.previous?.url,
      next: around.next?.url,
    });
    expect(urls(neighbours(tree, "/docs/email/templates"))).toEqual({
      previous: "/docs/email/sending",
      next: "/docs/email/domains",
    });
    expect(urls(neighbours(tree, "/docs/email/sending"))).toEqual({
      previous: undefined,
      next: "/docs/email/templates",
    });
    expect(urls(neighbours(tree, "/docs/quickstart")).next).toBeUndefined();
    expect(neighbours(tree, "/docs/nowhere")).toEqual({});
  });
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

  test("is one section: every folder is a sidebar group on every page", () => {
    expect(sectionsOf(flat)).toHaveLength(1);
    expect(labels(navGroups(flat, "/shipyard/docs/guides/runs"))).toEqual(["Overview", "Guides"]);
    expect(labels(navGroups(flat, "/shipyard/docs"))).toEqual(["Overview", "Guides"]);
    expect(labels(allGroups(flat))).toEqual(["Overview", "Guides"]);
  });

  test("previous and next cross its groups", () => {
    expect(neighbours(flat, "/shipyard/docs").next?.url).toBe("/shipyard/docs/guides/runs");
  });
});

describe("activeRoot", () => {
  test("picks the root holding the page", () => {
    expect(activeRoot(tree, "/docs/api-reference/emails/send-email")?.name).toBe("API reference");
    expect(activeRoot(tree, "/docs/email/domains")?.name).toBe("Email");
    expect(activeRoot(tree, "/docs")?.name).toBe("Get started");
  });

  test("falls back to the first root", () => {
    expect(activeRoot(tree, "/docs/nowhere")?.name).toBe("Get started");
  });
});

describe("content/docs", () => {
  const root = join(import.meta.dir, "../content/docs");
  const meta = (dir: string) =>
    JSON.parse(readFileSync(join(root, dir, "meta.json"), "utf8")) as {
      root?: boolean;
      icon?: string;
      description?: string;
      pages: string[];
    };

  test("every top-level folder is a section with an icon and a description", () => {
    const dirs = readdirSync(root).filter((name) => statSync(join(root, name)).isDirectory());
    expect(meta(".").pages.sort()).toEqual(dirs.sort());
    for (const dir of dirs) {
      expect({ dir, ...meta(dir) }).toMatchObject({
        dir,
        root: true,
        icon: expect.any(String),
        description: expect.any(String),
      });
    }
  });

  test("the API reference places every tag under a product", () => {
    const pages = meta("api-reference").pages;
    const firstSeparator = pages.findIndex((entry) => entry.startsWith("---"));
    const placed = pages.slice(firstSeparator).filter((entry) => !entry.startsWith("---"));
    const tags = new Set(
      Object.values(spec.paths).flatMap((item) =>
        Object.values(item).flatMap((operation) => operation.tags ?? []),
      ),
    );
    expect(placed.sort()).toEqual([...tags].map(kebabCase).sort());
  });
});
