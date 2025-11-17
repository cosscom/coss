import * as React from "react"
import {
  PageHeader,
  PageHeaderDescription,
  PageHeaderHeading,
} from "@coss/ui/components/page-header"
import { ParticlesSearchTrigger } from "@/components/particles-search-trigger"

export default async function Page() {
  return (
    <div className="container w-full">
      <PageHeader className="text-left max-w-2xl mx-0 items-start">
        <PageHeaderHeading>A new, modern UI component library built on top of Base UI.</PageHeaderHeading>
        <PageHeaderDescription className="max-w-2xl">
          Built for developers and AI.
        </PageHeaderDescription>
        <ParticlesSearchTrigger />
      </PageHeader>
      <div className="grid flex-1 items-stretch gap-9 pb-12 lg:grid-cols-2 lg:gap-6 xl:gap-9">

      </div>
    </div>
  )
}
