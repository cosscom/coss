import { DASHBOARD_PATH } from "@coss/auth/slugs";
import { cn } from "@coss/ui/lib/utils";
import Link from "next/link";
import type { ReactNode } from "react";
import type { Session } from "@/lib/auth";
import { isPlatformAdmin } from "@/lib/session";
import { ImpersonationBanner } from "./impersonation-banner";
import { UserMenu } from "./user-menu";

/** Top bar of every signed-in page: logo, page-specific navigation (`children`) and the user menu. */
export function SiteHeader(props: { session: Session; className?: string; children?: ReactNode }) {
  const { session } = props;
  return (
    <>
      {session.session.impersonatedBy ? <ImpersonationBanner email={session.user.email} /> : null}
      <header className="border-b">
        <div
          className={cn(
            "mx-auto flex max-w-5xl flex-wrap items-center gap-x-4 gap-y-2 px-6 py-3",
            props.className,
          )}
        >
          <Link className="font-semibold" href={DASHBOARD_PATH}>
            COSS
          </Link>
          {props.children}
          <div className="ms-auto">
            <UserMenu
              email={session.user.email}
              isAdmin={isPlatformAdmin(session)}
              name={session.user.name}
            />
          </div>
        </div>
      </header>
    </>
  );
}
