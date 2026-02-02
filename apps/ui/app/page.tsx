import {
  PageHeader,
  PageHeaderDescription,
  PageHeaderHeading,
} from "@coss/ui/shared/page-header";
import type { Metadata } from "next";
import Link from "next/link";
import { getCategoryThumbnail } from "@/components/category-thumbnails";
import { categories } from "@/config/categories";
import { Button } from "@/registry/default/ui/button";
import {
  Card,
  CardFrame,
  CardFrameDescription,
  CardFrameHeader,
  CardFrameTitle,
  CardPanel,
} from "@/registry/default/ui/card";

const description = "Built for developers and AI.";

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
            <Button size="lg">Get started</Button>
            <Button size="lg" variant="outline">
              Browse 418 components
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
          <div className="grid gap-8 pt-8 pb-12 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {categories.map((category) => (
              <CategoryCard
                key={category.slug}
                name={category.name}
                slug={category.slug}
                thumbnail={getCategoryThumbnail(category.slug)}
              />
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

type CategoryCardProps = {
  slug: string;
  name: string;
  thumbnail?: React.ReactNode;
};

function CategoryCard({ slug, name, thumbnail }: CategoryCardProps) {
  const href = `/docs/components/${slug}`;

  return (
    <CardFrame className="after:-inset-[5px] after:-z-1 w-full after:pointer-events-none after:absolute after:rounded-[calc(var(--radius-xl)+4px)] after:border after:border-border/64">
      <CardFrameHeader>
        <CardFrameTitle
          className="font-heading text-base"
          render={
            <h2>
              <Link href={href}>{name}</Link>
            </h2>
          }
        />
        <CardFrameDescription render={<p />}>
          A set of collapsible headings with panel content.
        </CardFrameDescription>
      </CardFrameHeader>
      <Card className="aspect-20/13 flex-1 flex-col flex-wrap overflow-x-auto bg-[color-mix(in_srgb,var(--color-card),var(--color-sidebar))] dark:bg-background">
        <CardPanel className="flex flex-1 items-center justify-center px-8 [--border:--alpha(var(--color-black)/7%)] [--btn-from:--alpha(var(--color-primary)/90%)] [--btn-to:var(--color-primary)] dark:[--border:--alpha(var(--color-white)/3%)] dark:[--btn-from:var(--color-primary)] dark:[--btn-to:--alpha(var(--color-primary)/90%)]">
          {thumbnail}
        </CardPanel>
      </Card>
    </CardFrame>
  );
}
