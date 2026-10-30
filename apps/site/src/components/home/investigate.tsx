import { CheckIcon, ChevronRightIcon } from "lucide-react";
import type { ReactNode } from "react";

const EVENTS: { type: string; at: string }[] = [
  { type: "sent", at: "09:41:08" },
  { type: "delivered", at: "09:41:12" },
  { type: "opened", at: "09:43:27" },
];

const NAV = ["Emails", "Templates", "Webhooks", "Logs"];

function Window({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-xl border bg-background">
      <div className="flex items-center gap-1.5 border-b px-3 py-2">
        <span className="size-2 rounded-full border" />
        <span className="size-2 rounded-full border" />
        <span className="size-2 rounded-full border" />
        <span className="ml-2 truncate font-mono text-muted-foreground text-xs">{label}</span>
      </div>
      {children}
    </div>
  );
}

/** One email's page in the dashboard, reduced to its subject and events. */
export function DashboardView() {
  return (
    <Window label="coss.com/acme/…/emails">
      <div className="flex text-sm">
        <nav
          aria-hidden
          className="hidden w-32 shrink-0 flex-col gap-0.5 border-r bg-muted/40 p-2.5 sm:flex"
        >
          {NAV.map((item) => (
            <span
              className={
                item === "Emails"
                  ? "rounded-md bg-background px-2 py-1 font-medium shadow-xs ring-1 ring-border"
                  : "px-2 py-1 text-muted-foreground"
              }
              key={item}
            >
              {item}
            </span>
          ))}
        </nav>
        <div className="flex min-w-0 flex-1 flex-col gap-4 p-4 sm:p-5">
          <div className="flex flex-col gap-1">
            <span className="font-semibold text-base tracking-[-0.01em]">
              Welcome to Acme, John
            </span>
            <span className="truncate text-muted-foreground text-xs">To john@example.com</span>
          </div>
          <ol className="relative flex flex-col gap-3 before:absolute before:top-2 before:bottom-2 before:left-[4px] before:w-px before:bg-border">
            {EVENTS.map((event) => (
              <li className="relative flex items-center gap-3 ps-5" key={event.type}>
                <span
                  aria-hidden
                  className={
                    event.type === "delivered"
                      ? "absolute left-0 size-[9px] rounded-full bg-foreground ring-2 ring-background"
                      : "absolute left-0 size-[9px] rounded-full bg-muted-foreground/48 ring-2 ring-background"
                  }
                />
                <span className={event.type === "delivered" ? "font-medium" : undefined}>
                  {event.type}
                </span>
                <span className="ms-auto font-mono text-muted-foreground text-xs">{event.at}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </Window>
  );
}

/** A coding agent answering a support question through the MCP server. */
export function AgentView() {
  return (
    <Window label="coss-mcp">
      <div className="flex flex-col gap-2 px-3.5 py-3 font-mono text-xs leading-relaxed">
        <p className="flex gap-2">
          <ChevronRightIcon aria-hidden className="mt-0.5 size-3.5 shrink-0" />
          Did john@example.com get the onboarding email?
        </p>
        <p className="flex gap-2">
          <CheckIcon aria-hidden className="mt-0.5 size-3.5 shrink-0" />
          <span className="text-muted-foreground">
            Yes, delivered at 09:41 and opened two minutes later.
          </span>
        </p>
      </div>
    </Window>
  );
}

/** The same answer from the SDK, for a support view in the customer's own admin panel. */
export function ApiView() {
  return (
    <Window label="admin.ts">
      <pre className="overflow-x-auto px-3.5 py-3 font-mono text-xs leading-relaxed">
        <code>
          {"const { data } = await diagnose(coss, emailId);\n"}
          <span className="text-muted-foreground">
            {'// data.summary: "Delivered to john@example.com."'}
          </span>
        </code>
      </pre>
    </Window>
  );
}
