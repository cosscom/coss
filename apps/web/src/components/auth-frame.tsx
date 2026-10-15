import { cn } from "@coss/ui/lib/utils";
import type { ReactNode } from "react";

/** SDK calls shown on the panel: real methods of the `coss` SDK. */
const PARTS = [
  { call: "coss.email.send()", label: "Email" },
  { call: "coss.risk.assess()", label: "Risk" },
  { call: "coss.webhookEndpoints.create()", label: "Webhooks" },
];

/**
 * The frame of the signed-out and standalone pages (sign-in, sign-up, onboarding, invitations):
 * the form on the left under the wordmark, and from `lg` a panel on coss.com's drafting grid with
 * the product line. A form's `Card` sits flat on the page here (no border, shadow or padding),
 * so the forms keep their markup.
 */
export function AuthFrame({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-dvh bg-background lg:grid-cols-2">
      <div className="flex min-w-0 flex-col px-6 py-6 sm:px-10">
        <a
          className="w-fit font-bold font-heading text-xl [font-variation-settings:'GEOM'_50,'opsz'_32]"
          href="/"
        >
          coss.com
        </a>
        <main className="flex flex-1 items-center justify-center py-12">
          <div
            className={cn(
              "w-full max-w-sm",
              // Flatten the form's card onto the page.
              "[&_[data-slot=card]]:border-none [&_[data-slot=card]]:bg-transparent [&_[data-slot=card]]:shadow-none [&_[data-slot=card]]:before:hidden",
              "[&_[data-slot=card-header]]:px-0 [&_[data-slot=card-header]]:pt-0 [&_[data-slot=card-panel]]:px-0 [&_[data-slot=card-panel]]:pb-0 [&_[data-slot=card-footer]]:px-0",
              "[&_[data-slot=card-title]]:text-2xl [&_[data-slot=card-title]]:tracking-[-0.02em]",
            )}
          >
            {children}
          </div>
        </main>
        <footer className="text-muted-foreground text-xs">© Cal.com, Inc.</footer>
      </div>
      <aside className="relative hidden p-2 lg:block">
        <div className="drafting-grid flex h-full flex-col justify-between overflow-hidden rounded-2xl border bg-sidebar p-10 xl:p-14">
          <p className="max-w-lg text-balance font-semibold text-[clamp(2.25rem,3.6vw,3.5rem)] leading-[0.95] tracking-[-0.035em]">
            The foundation the world's apps are built on.
          </p>
          <div className="flex flex-col gap-6">
            <p className="max-w-md text-lg text-muted-foreground leading-snug">
              Email, risk and more behind one SDK and one API key.
            </p>
            <ul className="flex max-w-md flex-col border-t">
              {PARTS.map((part, index) => (
                <li className="flex items-baseline gap-3 border-b py-3 text-sm" key={part.call}>
                  <span className="font-mono text-muted-foreground text-xs">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span>{part.label}</span>
                  <code className="ms-auto font-mono text-[0.8125rem]">{part.call}</code>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </aside>
    </div>
  );
}
