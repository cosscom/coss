"use client"

import { useEffect } from "react"
import Link from "next/link"
import { Button } from "@/registry/default/ui/button"
import { useRouter } from "next/navigation"
import { HugeiconsIcon } from "@hugeicons/react"
import { Search01Icon } from "@hugeicons/core-free-icons"

export function ParticlesSearchTrigger() {
  const router = useRouter()

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        router.push("/particles")
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [router])

  return (
    <Button variant="outline" size="xl" className="min-w-72" render={<Link href="/particles" />}>
      <span className="flex grow items-center gap-2">
        <HugeiconsIcon icon={Search01Icon} strokeWidth={2} className="-ms-1 opacity-72" />
        <span className="font-normal text-zinc-400 dark:text-zinc-500">
          Search particles…
        </span>
        <div className="pointer-events-none ml-auto flex items-center justify-center text-muted-foreground/80">
          <kbd className="inline-flex font-[inherit] text-xs font-medium text-muted-foreground">
            <span className="opacity-70">⌘</span>K
          </kbd>
        </div>
      </span>
    </Button>
  )
}
