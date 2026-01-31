import {
  PageHeader,
  PageHeaderDescription,
  PageHeaderHeading,
} from "@coss/ui/shared/page-header";
import { AlertCircleIcon, ChevronDownIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { categories } from "@/config/categories";
import {
  Card,
  CardFrame,
  CardFrameDescription,
  CardFrameHeader,
  CardFrameTitle,
  CardPanel,
} from "@/registry/default/ui/card";

const accordionThumbnail = (
  <Card className="w-full max-w-50 shadow-md/3">
    <CardPanel className="divide-y divide-border p-0">
      <div className="p-3">
        <div className="flex items-center gap-2">
          <ChevronDownIcon className="size-4 text-muted-foreground/88" />
          <div className="h-1.5 w-[60%] rounded-full bg-muted-foreground/40" />
        </div>
      </div>
      <div className="p-3">
        <div className="flex items-center gap-2">
          <ChevronDownIcon className="size-4 rotate-180 text-muted-foreground/88" />
          <div className="flex flex-1 flex-col gap-2">
            <div className="h-1.5 w-[50%] rounded-full bg-muted-foreground/40" />
            <div className="h-1.5 w-[90%] rounded-full bg-muted-foreground/20" />
          </div>
        </div>
      </div>
      <div className="p-3">
        <div className="flex items-center gap-2">
          <ChevronDownIcon className="size-4 text-muted-foreground/88" />
          <div className="h-1.5 w-[60%] rounded-full bg-muted-foreground/40" />
        </div>
      </div>
    </CardPanel>
  </Card>
);

const alertThumbnail = (
  <Card className="w-full shadow-md/3">
    <CardPanel className="divide-y divide-border p-3">
      <div className="flex items-center gap-2">
        <AlertCircleIcon className="size-4 text-muted-foreground/88" />
        <div className="h-1.5 w-[70%] rounded-full bg-muted-foreground/20" />
      </div>
    </CardPanel>
  </Card>
);

const alertDialogThumbnail = (
  <Card className="w-full max-w-50 shadow-md/3">
    <CardPanel className="flex flex-col gap-5 px-4 py-5">
      <div className="flex flex-col gap-2">
        <div className="h-1.5 w-[50%] rounded-full bg-muted-foreground/40" />
        <div className="h-1.5 w-[90%] rounded-full bg-muted-foreground/20" />
      </div>
      <div className="flex items-center justify-end gap-2">
        <div className="h-1.5 w-7 rounded-sm bg-muted-foreground/20" />
        <div className="h-4 w-7 rounded-sm bg-muted-foreground/40" />
      </div>
    </CardPanel>
  </Card>
);

const description = "Built for developers and AI.";

export const metadata: Metadata = {
  description,
  title: "A new, modern UI component library built on top of Base UI - coss ui",
};

export default function Page() {
  return (
    <div className="container w-full" data-home>
      <PageHeader className="max-w-2xl *:items-start *:pb-8! *:text-left">
        <PageHeaderHeading>
          A new, modern UI component library built on top of Base UI.
        </PageHeaderHeading>
        <PageHeaderDescription>{description}</PageHeaderDescription>
      </PageHeader>
      <div className="relative">
        <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {categories.map((category) => (
            <CategoryCard
              key={category.slug}
              name={category.name}
              slug={category.slug}
              thumbnail={
                category.slug === "accordion"
                  ? accordionThumbnail
                  : category.slug === "alert"
                    ? alertThumbnail
                    : category.slug === "alert-dialog"
                      ? alertDialogThumbnail
                      : undefined
              }
            />
          ))}
        </div>
      </div>
    </div>
  );
}

type CategoryCardProps = {
  slug: string;
  name: string;
  /** Optional SVG or element to use as thumbnail; omit for default placeholder */
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
        <CardPanel className="flex flex-1 items-center justify-center px-8">
          {thumbnail ?? (
            <svg
              className="size-12 opacity-50"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <title>Placeholder</title>
              <path
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </CardPanel>
      </Card>
    </CardFrame>
  );
}
