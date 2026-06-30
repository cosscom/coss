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
  searchParams: Promise<{
    bookingUrl?: string;
    event?: string;
    orgId?: string;
    teamId?: string;
    username?: string;
  }>;
};

function parsePositiveInt(value?: string): number | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

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

export default async function Page({ params, searchParams }: PageProps) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
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
  const previewProps = (() => {
    if (slug !== "booker") {
      return preview;
    }

    if (query.bookingUrl?.trim()) {
      const orgId = parsePositiveInt(query.orgId);
      return {
        target: {
          bookingUrl: query.bookingUrl.trim(),
          orgId,
          type: "link" as const,
        },
      };
    }

    const eventSlug = query.event?.trim();
    const teamId = parsePositiveInt(query.teamId);
    const orgId = parsePositiveInt(query.orgId);

    if (teamId && eventSlug) {
      return {
        target: {
          eventSlug,
          orgId,
          teamId,
          type: "team" as const,
        },
      };
    }

    const username = query.username?.trim();
    if (username && eventSlug) {
      return {
        target: {
          eventSlug,
          orgId,
          type: "user" as const,
          username,
        },
      };
    }

    if (preview?.username && preview.eventSlug) {
      return {
        target: {
          eventSlug: preview.eventSlug,
          type: "user" as const,
          username: preview.username,
        },
      };
    }

    return undefined;
  })();

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
