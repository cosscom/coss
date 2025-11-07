import { Suspense } from "react"
import type { Metadata } from "next"
import {
  PageHeader,
  PageHeaderDescription,
  PageHeaderHeading,
} from "@coss/ui/components/page-header"

import SearchContainer from "./search-container"

export const metadata: Metadata = {
  title: "Search components",
  description: "Search for components in the UI library.",
}

export default function Page() {
  return (
    <div className="container w-full">
      <PageHeader>
        <PageHeaderHeading>Search components</PageHeaderHeading>
        <PageHeaderDescription className="max-w-2xl">
          Use this page to quickly find a component by selecting categories,
          features, or tags.
        </PageHeaderDescription>
      </PageHeader>
      <Suspense>
        <SearchContainer />
      </Suspense>
    </div>
  )
}
