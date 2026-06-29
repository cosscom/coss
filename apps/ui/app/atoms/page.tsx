import {
  PageHeader,
  PageHeaderDescription,
  PageHeaderHeading,
} from "@coss/ui/shared/page-header";
import type { Metadata } from "next";
import Link from "next/link";
import {
  Card,
  CardFrame,
  CardFrameDescription,
  CardFrameHeader,
  CardFrameTitle,
  CardPanel,
} from "@/registry/default/ui/card";
import { getAtomThumbnail } from "@/components/atom-thumbnails";
import { getAtomTypes } from "@/lib/atoms";

const description = "Copy-paste React components infused with Cal.com API v2.";

export const metadata: Metadata = {
  description,
  title: "Scheduling, in your codebase. - coss ui",
};

export default function Page() {
  return (
    <div className="container w-full">
      <PageHeader className="max-w-2xl *:items-start *:text-left">
        <PageHeaderHeading>Scheduling, in your codebase.</PageHeaderHeading>
        <PageHeaderDescription>{description}</PageHeaderDescription>
      </PageHeader>
      <div className="grid flex-1 items-stretch gap-9 pb-12 lg:gap-6 xl:gap-9">
        {getAtomTypes().map((atom) => (
          <AtomCard
            description={atom.description}
            key={atom.slug}
            name={atom.displayName}
            slug={atom.slug}
            thumbnail={getAtomThumbnail(atom.slug)}
          />
        ))}
      </div>
    </div>
  );
}

type AtomCardProps = {
  slug: string;
  name: string;
  description?: string;
  thumbnail?: React.ReactNode;
};

function AtomCard({ slug, name, description, thumbnail }: AtomCardProps) {
  const href = `/atoms/${slug}`;

  return (
    <CardFrame className="w-full after:pointer-events-none after:absolute after:-inset-[5px] after:-z-1 after:rounded-[calc(var(--radius-xl)+4px)] after:border after:border-border/64">
      <CardFrameHeader className="static grid grid-rows-[auto_1fr]">
        <CardFrameTitle
          className="font-heading text-base"
          render={
            <h2>
              <Link className="before:absolute before:inset-0" href={href}>
                {name}
              </Link>
            </h2>
          }
        />
        <CardFrameDescription
          className="line-clamp-2 sm:h-[2lh]"
          render={<p />}
        >
          {description || "\u00A0"}
        </CardFrameDescription>
      </CardFrameHeader>
      <Card className="pointer-events-none min-h-55 flex-1 flex-col flex-wrap overflow-x-auto bg-[color-mix(in_srgb,var(--color-card),var(--color-sidebar))] dark:bg-background">
        <CardPanel className="flex flex-1 items-center justify-center px-8 [--border:--alpha(var(--color-black)/7%)] [--btn-from:--alpha(var(--color-primary)/90%)] [--btn-to:var(--color-primary)] in-[[data-slot=card-frame]:has(a:not(:hover))]:*:translate-y-0.5 *:transition-transform *:duration-200 dark:[--border:--alpha(var(--color-white)/3%)] dark:[--btn-from:var(--color-primary)] dark:[--btn-to:--alpha(var(--color-primary)/90%)]">
          {thumbnail}
        </CardPanel>
      </Card>
    </CardFrame>
  );
}
