import {
  PageHeader,
  PageHeaderDescription,
  PageHeaderHeading,
} from "@coss/ui/shared/page-header";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { RegistryBlockCard } from "@/components/registry-block-card";
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
    preview?.username && preview.eventSlug ? preview : undefined;

  return (
    <>
      <div className="container w-full">
        <PageHeader className="max-w-2xl *:items-start *:text-left">
          <PageHeaderHeading>{atom.displayName}</PageHeaderHeading>
          {atom.description ? (
            <PageHeaderDescription>{atom.description}</PageHeaderDescription>
          ) : null}
        </PageHeader>
      </div>
      <div className="container w-full pb-12">
        <Suspense>
          <RegistryBlockCard
            className={className}
            description={atom.description}
            name={variantName}
            previewKind="atom"
            previewProps={previewProps}
          />
        </Suspense>
      </div>
    </>
  );
}
