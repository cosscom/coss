"use client";
import { DASHBOARD_PATH } from "@coss/auth/slugs";
import { Button } from "@coss/ui/components/button";
import { Group } from "@coss/ui/components/group";
import { Menu, MenuItem, MenuLinkItem, MenuPopup, MenuTrigger } from "@coss/ui/components/menu";
import { ArrowDown01Icon, GithubIcon, GoogleIcon, Mail01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useRef, useState } from "react";
import { dashboardUrl } from "@/lib/site";

type Provider = "github" | "google";

/**
 * Starts Better Auth's social sign-in (`/api/auth/sign-in/social`, same origin on coss.com; proxied
 * to the dashboard in `next dev`) and follows the provider's URL. A provider the dashboard doesn't
 * offer, or any failure, lands on the dashboard's own sign-up page instead.
 */
async function signUpWith(provider: Provider): Promise<void> {
  const fallback = dashboardUrl("/sign-up");
  try {
    const response = await fetch("/api/auth/sign-in/social", {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ provider, callbackURL: DASHBOARD_PATH, errorCallbackURL: "/sign-up" }),
    });
    const result: { url?: unknown } = response.ok ? await response.json() : {};
    window.location.assign(typeof result.url === "string" ? result.url : fallback);
  } catch {
    window.location.assign(fallback);
  }
}

/** The primary sign-up action: GitHub first, Google and email from the attached menu. */
/** Per size: the main half's padding and the chevron's width (wide and low rather than tall). */
const SIZES = {
  default: { main: "px-4", chevron: "w-9 px-0 sm:w-8" },
  lg: { main: "px-5", chevron: "w-10 px-0 sm:w-9" },
} as const;

export function SignUpButton({
  size = "default",
  label = "Sign up with GitHub",
}: {
  size?: keyof typeof SIZES;
  /** The main half's text; the attached menu still offers Google and email. */
  label?: string;
}) {
  const [pending, setPending] = useState<Provider | null>(null);
  const groupRef = useRef<HTMLDivElement>(null);

  function start(provider: Provider) {
    setPending(provider);
    void signUpWith(provider).finally(() => setPending(null));
  }

  return (
    <Group aria-label="Sign up" ref={groupRef}>
      <Button
        className={`gap-2 ${SIZES[size].main}`}
        loading={pending === "github"}
        onClick={() => start("github")}
        size={size}
      >
        <HugeiconsIcon icon={GithubIcon} strokeWidth={2} />
        {label}
      </Button>
      <Menu>
        <MenuTrigger
          render={
            <Button aria-label="More ways to sign up" className={SIZES[size].chevron} size={size} />
          }
        >
          {/* A short, quiet divider instead of a full-height rule between the two halves. */}
          <span aria-hidden className="absolute inset-y-2 start-0 w-px bg-primary-foreground/16" />
          <HugeiconsIcon icon={ArrowDown01Icon} strokeWidth={2} />
        </MenuTrigger>
        {/* Hangs from the whole split button, at its width, and eases in from it. */}
        <MenuPopup
          align="start"
          anchor={groupRef}
          className="w-(--anchor-width) transition-[opacity,scale,translate] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] data-ending-style:-translate-y-1 data-starting-style:-translate-y-1 data-ending-style:scale-98 data-starting-style:scale-98 data-ending-style:opacity-0 data-starting-style:opacity-0 data-ending-style:duration-120"
          sideOffset={6}
        >
          <MenuItem disabled={pending !== null} onClick={() => start("google")}>
            <HugeiconsIcon icon={GoogleIcon} strokeWidth={2} />
            Sign up with Google
          </MenuItem>
          <MenuLinkItem href={dashboardUrl("/sign-up")}>
            <HugeiconsIcon icon={Mail01Icon} strokeWidth={2} />
            Sign up with email
          </MenuLinkItem>
        </MenuPopup>
      </Menu>
    </Group>
  );
}
