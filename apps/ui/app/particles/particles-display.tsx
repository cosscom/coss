import { Suspense } from "react"

import { Index } from "@/registry/__index__"
import type { RegistryCategory } from "@/registry/registry-categories"

import { ParticleCard } from "./particle-card"

export async function ParticlesDisplay({
  selectedCategories,
}: {
  selectedCategories: string[]
}) {
  const particles = Object.values(Index).filter(
    (item) => item.type === "registry:block"
  ) as Array<{
    name: string
    categories?: RegistryCategory[]
    meta?: { className?: string }
  }>

  const filteredParticles = particles.filter((particle) => {
    const categories = particle.categories ?? []
    return selectedCategories.every((value) =>
      categories.includes(value as RegistryCategory)
    )
  })

  if (filteredParticles.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-muted/50 p-8 text-center">
        <p className="text-muted-foreground">
          No components found for the selected filters.
        </p>
      </div>
    )
  }

  return (
    <div className="grid flex-1 items-stretch gap-9 pb-12 lg:grid-cols-2 lg:gap-6 xl:gap-9">
      {filteredParticles.map((particle) => {
        const className = particle.meta?.className as string | undefined
        return (
          <Suspense
            key={particle.name}
            fallback={
              <div className="flex min-h-20 items-center justify-center rounded-xl border bg-muted/50">
                Loading...
              </div>
            }
          >
            <ParticleCard name={particle.name} className={className} />
          </Suspense>
        )
      })}
    </div>
  )
}

