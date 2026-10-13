import { Button } from "@coss/ui/components/button";
import { Skeleton } from "@coss/ui/components/skeleton";
import { GithubIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Suspense } from "react";
import { GITHUB_REPO, GITHUB_URL } from "@/lib/site";

/** A repository on GitHub: `owner/name` for the stars, and the link. */
export interface GitHubRepo {
  repo: string;
  href: string;
}

/** The site's own repository. */
export const COSS_GITHUB: GitHubRepo = { repo: GITHUB_REPO, href: GITHUB_URL };

/**
 * The repository link of coss.com/ui's header, with its star count. The count is fetched once at
 * build time (the site is static), and left out when GitHub doesn't answer.
 */
export function GitHubLink({ repo, href }: GitHubRepo = COSS_GITHUB) {
  return (
    <Button
      className="relative h-8 shadow-none max-sm:w-8"
      render={<a href={href} rel="noreferrer" target="_blank" />}
      size="sm"
      variant="ghost"
    >
      <HugeiconsIcon className="size-4" icon={GithubIcon} strokeWidth={2} />
      <span className="sr-only">GitHub</span>
      <span className="max-sm:sr-only">
        <Suspense fallback={<Skeleton className="h-4 w-[25.5px]" />}>
          <StarsCount repo={repo} />
        </Suspense>
      </span>
    </Button>
  );
}

async function StarsCount({ repo }: { repo: string }) {
  const stars = await fetchStars(repo);
  if (stars === null) return null;
  return (
    <span className="w-8 text-muted-foreground text-xs tabular-nums">
      {stars >= 1000 ? `${(stars / 1000).toFixed(1)}k` : stars.toLocaleString("en-US")}
    </span>
  );
}

/** The repository's stars, or null when the API is unreachable or rate-limited. */
async function fetchStars(repo: string): Promise<number | null> {
  try {
    // force-cache: fetched during `next build` and baked into the static pages.
    const response = await fetch(`https://api.github.com/repos/${repo}`, { cache: "force-cache" });
    if (!response.ok) return null;
    const json: unknown = await response.json();
    const stars =
      json && typeof json === "object" && "stargazers_count" in json
        ? json.stargazers_count
        : undefined;
    return typeof stars === "number" && stars >= 0 ? stars : null;
  } catch {
    return null;
  }
}
