import { Suspense } from "react"
import type { Metadata } from "next"
import {
  PageHeader,
  PageHeaderDescription,
  PageHeaderHeading,
} from "@coss/ui/components/page-header"

import { ParticlesDisplay } from "./particles-display"
import SearchContainer from "./search-container"

const description =
  "Particles are more than just components. They are the building blocks of your design system. Use the filters to find the perfect component for your project."

export const metadata: Metadata = {
  title: "Search components",
  description,
}

async function ParticlesDisplayServer({
  searchParams,
}: {
  searchParams: Promise<{ tags?: string }>
}) {
  const params = await searchParams
  const selectedCategories = params.tags?.split(",").filter(Boolean) || []

  if (selectedCategories.length === 0) return null

  return <ParticlesDisplay selectedCategories={selectedCategories} />
}

export default function Page({
  searchParams,
}: {
  searchParams: Promise<{ tags?: string }>
}) {
  return (
    <div className="container w-full">
      <PageHeader className="*:pb-8!">
        <PageHeaderHeading>Browse Particles</PageHeaderHeading>
        <PageHeaderDescription className="max-w-2xl">
          {description}
        </PageHeaderDescription>
      </PageHeader>
      <Suspense>
        <SearchContainer />
      </Suspense>
      <Suspense>
        <ParticlesDisplayServer searchParams={searchParams} />
      </Suspense>
    </div>
  )
}
