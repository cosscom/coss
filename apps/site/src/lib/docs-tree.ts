import type * as PageTree from "fumadocs-core/page-tree";
import type { ReactNode } from "react";

/** A link in the sidebar, the mobile menu or the command menu. */
export interface NavPage {
  name: ReactNode;
  url: string;
}

/** A labelled run of pages: a root's leading pages, a `---Separator---`, or a nested folder. */
export interface NavGroup {
  /** Stable across renders: the first page's URL. */
  key: string;
  label: ReactNode;
  pages: NavPage[];
}

/** The sidebar tabs: top-level folders marked `"root": true` in their meta.json. */
export function rootFolders(tree: PageTree.Root): PageTree.Folder[] {
  return tree.children.filter((node): node is PageTree.Folder => node.type === "folder");
}

/** The root folder holding the current page (the first root when nothing matches). */
export function activeRoot(tree: PageTree.Root, pathname: string): PageTree.Folder | undefined {
  const roots = rootFolders(tree);
  return (
    roots.find((root) => pagesOf(root).some((page) => page.url === pathname)) ??
    roots.find((root) => pagesOf(root).some((page) => pathname.startsWith(`${page.url}/`))) ??
    roots[0]
  );
}

/**
 * A folder as sidebar groups: its index and leading pages under the folder's own name, then one
 * group per separator, and nested folders as groups of their own (their pages flattened).
 */
export function groupsOf(folder: PageTree.Folder): NavGroup[] {
  const groups: NavGroup[] = [];
  let current: Omit<NavGroup, "key"> = { label: folder.name, pages: [] };
  const flush = () => {
    if (current.pages.length > 0) groups.push({ key: current.pages[0]?.url ?? "", ...current });
  };
  if (folder.index) current.pages.push(folder.index);
  for (const node of folder.children) {
    if (node.type === "page") {
      if (!current.pages.some((page) => page.url === node.url)) current.pages.push(node);
    } else if (node.type === "separator") {
      flush();
      current = { label: node.name ?? "", pages: [] };
    } else {
      flush();
      const pages = pagesOf(node);
      if (pages.length > 0) groups.push({ key: pages[0]?.url ?? "", label: node.name, pages });
      current = { label: "", pages: [] };
    }
  }
  flush();
  return groups;
}

/** Every page of a folder, in sidebar order (its index first). */
export function pagesOf(folder: PageTree.Folder): NavPage[] {
  const pages: NavPage[] = [];
  const seen = new Set<string>();
  const add = (page: NavPage) => {
    if (seen.has(page.url)) return;
    seen.add(page.url);
    pages.push(page);
  };
  if (folder.index) add(folder.index);
  for (const node of folder.children) {
    if (node.type === "page") add(node);
    else if (node.type === "folder") for (const page of pagesOf(node)) add(page);
  }
  return pages;
}
