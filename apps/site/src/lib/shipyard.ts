import { SITE_URL } from "./site.ts";

/**
 * Shipyard's landing page at coss.com/shipyard (moved here from the coss ui repository's
 * `apps/shipyard`, where it was served with that base path). Its static assets (the harbour, the
 * film's loops, the chapters' line scenes and the scripts that bring them to life) are served
 * from `public/shipyard/assets`, so the page's path doubles as their base.
 */
export const SHIPYARD = {
  name: "Shipyard",
  path: "/shipyard",
  url: `${SITE_URL}/shipyard`,
  title: "Shipyard - coding agents on your own boxes",
  description:
    "Shipyard runs Claude Code, Codex and other coding agents on your own dev boxes. Work with them from your laptop; close it, and they keep going.",
  github: "https://github.com/cosscom/shipyard",
  // The docs still live in the cosscom/shipyard repository (they are not part of this site yet).
  docs: "https://github.com/cosscom/shipyard/tree/main/docs",
  docsInstall: "https://github.com/cosscom/shipyard/blob/main/docs/getting-started/install.mdx",
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
