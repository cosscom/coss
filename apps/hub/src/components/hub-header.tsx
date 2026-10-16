import { Button } from "@coss/ui/components/button";
import { Kbd } from "@coss/ui/components/kbd";
import { BellIcon, PlusIcon, SearchIcon } from "lucide-react";
import Link from "next/link";
import { avatarUrl, initials } from "@/lib/avatar";
import { currentViewer } from "@/lib/session";
import { ActorMenu } from "./actor-menu";

/** A header cell: full height, set off from the previous one by a hairline, like the page's ruling. */
const CELL = "flex h-full items-center border-border/64 border-s";

/**
 * The header of coss.com/ui, adapted like the site's: the wordmark names the section (`coss.com
 * hub`), the section's links follow it on the left; on the right, search, the new-request button
 * and the account sit in ruled cells. Signed out, the account cell offers sign-in and sign-up.
 */
export async function HubHeader() {
  const viewer = await currentViewer();
  const user = viewer?.user ?? null;
  const links: [string, string][] = [
    ["Projects", "/"],
    ["Prompt requests", "/calcom/cal.com/prompts"],
    ...(user ? ([["Your prompts", `/${user.handle}`]] as [string, string][]) : []),
  ];
  return (
    <header className="sticky top-0 z-40 w-full bg-sidebar/80 backdrop-blur-sm before:absolute before:inset-x-0 before:bottom-0 before:h-px before:bg-border/64">
      <div className="container relative flex h-(--header-height) w-full items-center gap-2 px-4 sm:px-6">
        <div className="flex shrink-0 items-center gap-1.5 pe-4 font-bold font-heading text-[1.375em] [font-variation-settings:'GEOM'_50,'opsz'_32] sm:text-2xl lg:pe-5">
          <Link aria-label="Home" href="/">
            coss.com
          </Link>
          <span className="text-muted-foreground/64">hub</span>
        </div>
        <nav aria-label="Hub" className={`${CELL} gap-1 ps-3 max-lg:hidden`}>
          {links.map(([label, href]) => (
            <Button key={href} render={<Link href={href} />} size="sm" variant="ghost">
              {label}
            </Button>
          ))}
        </nav>
        <div className="ms-auto flex h-full items-center">
          <div className={`${CELL} px-3 max-md:hidden`}>
            <label className="flex h-8 w-60 items-center gap-2 rounded-lg border border-input bg-background px-2.5 text-muted-foreground text-sm shadow-xs/5 dark:bg-input/32">
              <SearchIcon aria-hidden className="size-4" />
              <input
                aria-label="Search the hub"
                className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
                placeholder="Search"
                type="search"
              />
              <Kbd>/</Kbd>
            </label>
          </div>
          <div className={`${CELL} gap-2 ps-3 max-md:border-s-0 md:ps-6 min-[90rem]:ps-9`}>
            {user ? (
              <>
                <Button
                  aria-label="New prompt request"
                  render={<Link href="/calcom/cal.com/prompts/new" />}
                  size="sm"
                >
                  <PlusIcon aria-hidden />
                  <span className="max-sm:sr-only">New prompt request</span>
                </Button>
                <Button aria-label="Notifications" size="icon" variant="ghost">
                  <BellIcon aria-hidden />
                </Button>
                <ActorMenu
                  current={{
                    handle: user.handle,
                    name: user.name,
                    location: user.location,
                    avatarUrl: avatarUrl(user),
                    initials: initials(user.name),
                  }}
                  onboarded={viewer?.onboarded ?? false}
                />
              </>
            ) : (
              <>
                <Button render={<Link href="/sign-in" />} size="sm" variant="ghost">
                  Sign in
                </Button>
                <Button render={<Link href="/sign-up" />} size="sm">
                  Sign up
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
