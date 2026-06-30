import {
  PageHeader,
  PageHeaderDescription,
  PageHeaderHeading,
} from "@coss/ui/shared/page-header";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import {
  RegistryBlockCard,
  RegistryBlockCardSkeleton,
} from "@/components/registry-block-card";
import { getAtomRegistryItem, getAtomType, getAtomTypes } from "@/lib/atoms";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return getAtomTypes().map(({ slug }) => ({ slug }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const atom = getAtomType(slug);

  if (!atom) {
    return {};
  }

  return {
    description: atom.description,
    title: `${atom.displayName} - coss ui`,
  };
}

export default async function Page({ params }: PageProps) {
  const { slug } = await params;
  const atom = getAtomType(slug);

  if (!atom) {
    notFound();
  }

  const variantName = atom.variants[0];

  if (!variantName) {
    notFound();
  }

  const registryItem = getAtomRegistryItem(variantName);
  const className = registryItem?.meta?.className as string | undefined;
  const preview = registryItem?.meta?.preview as
    | { username: string; eventSlug: string }
    | undefined;
  const previewProps =
    slug === "booker" && preview?.username && preview.eventSlug
      ? {
          target: {
            eventSlug: preview.eventSlug,
            type: "user" as const,
            username: preview.username,
          },
        }
      : preview;

  return (
    <div className="container w-full">
      <PageHeader className="max-w-2xl *:items-start *:text-left">
        <PageHeaderHeading>{atom.displayName}</PageHeaderHeading>
        {atom.description ? (
          <PageHeaderDescription>{atom.description}</PageHeaderDescription>
        ) : null}
      </PageHeader>
      <div className="grid flex-1 items-stretch gap-9 pb-12 lg:gap-6 xl:gap-9">
        <Suspense
          fallback={<RegistryBlockCardSkeleton className={className} />}
        >
          <RegistryBlockCard
            className={className}
            description={atom.description}
            name={variantName}
            previewKind="atom"
            previewProps={previewProps}
          />
        </Suspense>
      </div>
    </div>
  );
}
