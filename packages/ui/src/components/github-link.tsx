import * as React from "react"
// @ts-ignore - Next types are supplied by consuming app via peerDependencies
import Link from "next/link"
import { GithubIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { siteConfig } from "@workspace/ui/lib/config"
import { Skeleton } from "@workspace/ui/ui/skeleton"
import { Button } from "@workspace/ui/ui/button"

export function GitHubLink() {
  return (
    <Button
      size="sm"
      variant="ghost"
      className="relative h-8 shadow-none max-sm:w-8"
      render={
        <Link href={siteConfig.links.github} target="_blank" rel="noreferrer">
          <HugeiconsIcon icon={GithubIcon} className="size-4" strokeWidth={2} />
          <span className="max-sm:sr-only">
            <React.Suspense fallback={<Skeleton className="h-4 w-8" />}>
              <StarsCount />
            </React.Suspense>
          </span>
        </Link>
      }
    />
  )
}

export async function StarsCount() {
  try {
    const data = await fetch(
      "https://api.github.com/repos/cosscom/coss",
      {
        // @ts-ignore - Next types are supplied by consuming app via peerDependencies
        next: { revalidate: 86400 }, // Cache for 1 day (86400 seconds)
      }
    )
    
    if (!data.ok) {
      throw new Error(`GitHub API error: ${data.status}`)
    }
    
    const json = await data.json()
    const starsCount = json.stargazers_count

    if (typeof starsCount !== 'number' || starsCount < 0) {
      throw new Error('Invalid stars count')
    }

    return (
      <span className="w-8 text-xs text-muted-foreground tabular-nums">
        {starsCount >= 1000
          ? `${(starsCount / 1000).toFixed(1)}k`
          : starsCount.toLocaleString()}
      </span>
    )
  } catch (error) {
    // Return nothing when GitHub API is unavailable or repo doesn't exist
    return null
  }
}
