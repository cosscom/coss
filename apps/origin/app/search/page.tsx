import type { Metadata } from "next";
import { Suspense } from "react";

import PageHeader from "@/components/page-header";

import ComponentsContainer from "./components-container";

export const metadata: Metadata = {
  description: "Search for components in the UI library.",
  title: "Search a UI component",
};

export default function Page() {
  return (
    <>
      <PageHeader className="mb-10" title="Search component">
        Use this page to quickly find a component (e.g., multiselect, vertical
        slider, etc.)
      </PageHeader>
      <Suspense>
        <ComponentsContainer />
      </Suspense>
    </>
  );
}
