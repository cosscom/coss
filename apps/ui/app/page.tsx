import {
  PageHeader,
  PageHeaderDescription,
  PageHeaderHeading,
} from "@coss/ui/shared/page-header";
import { SiteFooter } from "@coss/ui/shared/site-footer";
import type { Metadata } from "next";
import Link from "next/link";
import { AnimatedCategoryCard } from "@/components/animated-category-card";
import { categories } from "@/config/categories";
import { Button } from "@/registry/default/ui/button";
import { particles } from "@/registry/registry-particles";

const description = "Built for developers and AI.";
const particleCount = particles.length;

export const metadata: Metadata = {
  description,
  title: "A new, modern UI component library built on top of Base UI - coss ui",
};

export default function Page() {
  return (
    <>
      <div className="container w-full">
        <PageHeader className="max-w-2xl *:items-start *:text-left">
          <PageHeaderHeading>
            A new, modern UI component library built on top of Base UI.
          </PageHeaderHeading>
          <PageHeaderDescription>{description}</PageHeaderDescription>
          <div className="mt-2 flex gap-2">
            <Button render={<Link href="/docs" />} size="lg">
              Get started
            </Button>
            <Button
              render={<Link href="/particles" />}
              size="lg"
              variant="outline"
            >
              Browse {particleCount} particles
            </Button>
          </div>
        </PageHeader>
      </div>
      <div className="relative before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-border/64">
        <div
          aria-hidden="true"
          className="before:-left-[11.5px] before:-ml-1 after:-right-[11.5px] after:-mr-1 container pointer-events-none absolute inset-0 z-50 before:absolute before:top-[-3.5px] before:z-1 before:size-2 before:rounded-[2px] before:border before:border-border before:bg-popover before:bg-clip-padding before:shadow-xs after:absolute after:top-[-3.5px] after:z-1 after:size-2 after:rounded-[2px] after:border after:border-border after:bg-background after:bg-clip-padding after:shadow-xs dark:after:bg-clip-border dark:before:bg-clip-border"
        />
        <div className="container w-full">
          <div className="grid gap-6 pt-8 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8 xl:grid-cols-4">
            {categories.map((category, index) => (
              <AnimatedCategoryCard
                description={category.description}
                index={index}
                key={category.slug}
                name={category.name}
                slug={category.slug}
              />
            ))}
          </div>
        </div>
      </div>
      <SiteFooter />
    </>
  );
}
