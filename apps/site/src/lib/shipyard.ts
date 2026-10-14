import { type NavItem, SITE_URL } from "./site.ts";

/**
 * Shipyard's landing page and docs at coss.com/shipyard (moved here from the coss ui repository's
 * `apps/shipyard`, where they were served with that base path). The landing page's static assets
 * (the harbour, the film's loops, the chapters' line scenes and the scripts that bring them to
 * life) are served from `public/shipyard/assets`, the docs' screenshots from
 * `public/shipyard/shots`, so the page's path doubles as their base.
 */
export const SHIPYARD = {
  name: "Shipyard",
  path: "/shipyard",
  url: `${SITE_URL}/shipyard`,
  title: "Shipyard - coding agents on your own boxes",
  description:
    "Shipyard runs Claude Code, Codex and other coding agents on your own dev boxes. Work with them from your laptop; close it, and they keep going.",
  githubRepo: "cosscom/shipyard",
  github: "https://github.com/cosscom/shipyard",
  /** The docs (content/shipyard, src/lib/shipyard-docs.ts) and their own search index. */
  docs: "/shipyard/docs",
  docsInstall: "/shipyard/docs/getting-started/install",
  searchApi: "/shipyard/docs/search.json",
  // The app's downloads, the live demo and the box's install line stay on berthd.app, built and
  // published from the cosscom/shipyard repository.
  links: {
    demo: "https://berthd.app/demo/",
    install: "https://berthd.app/install",
    linuxAppImage:
      "https://github.com/cosscom/shipyard/releases/latest/download/Berth-linux-x86_64-alpha.AppImage",
    linuxDeb:
      "https://github.com/cosscom/shipyard/releases/latest/download/Berth-linux-x86_64-alpha.deb",
    macDmg:
      "https://github.com/cosscom/shipyard/releases/latest/download/Berth-macos-universal.dmg",
  },
} as const;

/** Header links of Shipyard's landing page and docs: the docs, the download, and its repository. */
export const SHIPYARD_LINKS: readonly NavItem[] = [
  { label: "Docs", href: SHIPYARD.docs },
  { label: "Download", href: `${SHIPYARD.path}#install-now` },
  { label: "GitHub", href: SHIPYARD.github, external: true },
];
