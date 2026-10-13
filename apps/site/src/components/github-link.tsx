import { Button } from "@coss/ui/components/button";
import { GithubIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { GITHUB_URL } from "@/lib/site";

/** The repository link of coss.com/ui's header (without its star count: the site is fully static). */
export function GitHubLink() {
  return (
    <Button
      className="relative size-8 shadow-none"
      render={<a href={GITHUB_URL} rel="noreferrer" target="_blank" />}
      size="icon"
      variant="ghost"
    >
      <HugeiconsIcon className="size-4" icon={GithubIcon} strokeWidth={2} />
      <span className="sr-only">GitHub</span>
    </Button>
  );
}
