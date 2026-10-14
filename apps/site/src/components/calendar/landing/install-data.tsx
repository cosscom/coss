import type { CodeTab } from "@/components/calendar/site/code-tabs";
import { highlight } from "@/components/calendar/site/highlight";
import { abs } from "@/lib/calendar/site";

export { highlight };

const PAGE = (from: string) => `import { Kloq, KloqToolbar } from "${from}";

export default function Page() {
  return (
    <div className="h-dvh">
      <Kloq>
        <KloqToolbar />
      </Kloq>
    </div>
  );
}`;

type RawPane = { title: string; code: string; lang: string; command?: true };

const RAW: { id: string; label: string; note: string; panes: RawPane[] }[] = [
  {
    id: "npm",
    label: "npm",
    note: "Compiled and typed, in node_modules. React 19 and Tailwind v4 assumed. Updates with npm update.",
    panes: [
      { title: "terminal", code: "npm install kloq", lang: "bash", command: true },
      { title: "app/layout.tsx", code: `import "kloq/styles.css";`, lang: "tsx" },
      { title: "app/page.tsx", code: PAGE("kloq"), lang: "tsx" },
    ],
  },
  {
    id: "registry",
    label: "Source",
    note: "The whole calendar lands under components/kloq/ as files you own — a custom slot is another file, a spring tweak is a line you can edit. Nothing updates unless you re-run the CLI.",
    panes: [
      {
        title: "components.json",
        code: `{ "registries": { "@kloq": "${abs("/kloq/r/registry.json").replace(/registry\.json$/, "{name}.json")}" } }`,
        lang: "json",
      },
      { title: "terminal", code: "npx shadcn@latest add @kloq/kloq", lang: "bash", command: true },
      { title: "app/layout.tsx", code: `import "@/components/kloq/styles/kloq.css";`, lang: "tsx" },
      { title: "app/page.tsx", code: PAGE("@/components/kloq"), lang: "tsx" },
    ],
  },
];

/** The two install channels as tabs of highlighted panes. */
export async function installTabs(): Promise<CodeTab[]> {
  return Promise.all(
    RAW.map(async ({ id, label, note, panes }) => {
      return {
        id,
        label,
        note,
        panes: await Promise.all(
          panes.map(async ({ lang, command, ...pane }) => ({
            ...pane,
            command,
            html: await highlight(pane.code, lang),
            copyLabel: command ? "Copy install command" : undefined,
          })),
        ),
      };
    }),
  );
}
