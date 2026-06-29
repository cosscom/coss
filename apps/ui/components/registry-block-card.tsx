import { Icons } from "@coss/ui/shared/icons";
import { InformationCircleIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Suspense } from "react";
import { Index } from "@/registry/__index__";
import { Button } from "@/registry/default/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerPopup,
  DrawerTrigger,
} from "@/registry/default/ui/drawer";
import { Skeleton } from "@/registry/default/ui/skeleton";
import { ParticleCardContainer } from "@/app/particles/particle-card-container";
import { CodeBlockCommand } from "@/components/code-block-command";
import { ComponentSource } from "@/components/component-source";
import { CopyRegistry } from "@/components/copy-registry";

const defaultParticlePreviewProps = {
  currentPage: 1,
  totalPages: 10,
  totalResults: 100,
};

function RegistryBlockPreview({
  name,
  previewProps,
}: {
  name: string;
  previewProps?: Record<string, unknown>;
}) {
  const item = Index[name];
  const Component = item?.component;

  if (!Component) {
    return (
      <p className="text-muted-foreground text-sm">
        Component {name} not found
      </p>
    );
  }

  return <Component {...previewProps} />;
}

export function RegistryBlockCard({
  name,
  description,
  className,
  colSpan,
  previewKind = "particle",
  previewProps,
}: {
  name: string;
  description?: string;
  className?: string;
  colSpan?: number;
  previewKind?: "atom" | "particle";
  previewProps?: Record<string, unknown>;
}) {
  const cossuiUrl = process.env.NEXT_PUBLIC_APP_URL || "https://coss.com/ui";
  const item = Index[name];

  if (!item) {
    return null;
  }

  const previewAttribute =
    previewKind === "atom" ? "data-atom" : "data-particle";
  const resolvedPreviewProps =
    previewProps ??
    (previewKind === "particle" ? defaultParticlePreviewProps : undefined);

  return (
    <ParticleCardContainer
      className={className}
      colSpan={colSpan}
      footer={
        <>
          <p className="flex flex-1 gap-1 truncate text-muted-foreground text-xs">
            <HugeiconsIcon
              className="size-3 h-lh shrink-0"
              icon={InformationCircleIcon}
              strokeWidth={2}
            />
            <span className="truncate">{description ?? item.description}</span>
          </p>
          <div className="flex items-center gap-1.5">
            {process.env.NODE_ENV === "development" && (
              <Button
                className="text-xs"
                disabled
                size="sm"
                title="Registry item name"
                variant="outline"
              >
                {item.name}
              </Button>
            )}
            <CopyRegistry
              value={`${cossuiUrl}/r/${name}.json`}
              variant="outline"
            />
            <Drawer position="right">
              <DrawerTrigger
                render={
                  <Button className="text-sm" size="sm" variant="outline" />
                }
              >
                View code
              </DrawerTrigger>
              <DrawerPopup
                className="max-w-4xl"
                showBar
                showCloseButton={false}
                variant="straight"
              >
                <DrawerContent className="flex flex-1 flex-col overflow-hidden p-6">
                  <div>
                    <h2 className="mb-4 font-heading font-semibold text-xl">
                      Installation
                    </h2>
                    <figure data-rehype-pretty-code-figure>
                      <CodeBlockCommand
                        __bun__={`bunx --bun shadcn@latest add @coss/${name}`}
                        __npm__={`npx shadcn@latest add @coss/${name}`}
                        __pnpm__={`pnpm dlx shadcn@latest add @coss/${name}`}
                        __yarn__={`yarn dlx shadcn@latest add @coss/${name}`}
                      />
                    </figure>
                  </div>
                  <div className="flex h-full flex-1 flex-col overflow-hidden">
                    <div className="flex items-center justify-between gap-2">
                      <h2 className="mt-6 mb-4 font-heading font-semibold text-xl">
                        Code
                      </h2>
                      <Button
                        render={
                          <a
                            href={`https://v0.dev/chat/api/open?url=${encodeURIComponent(`${cossuiUrl}/r/${name}.json`)}`}
                            rel="noopener noreferrer"
                            target="_blank"
                          >
                            Open in<span className="sr-only">v0</span>
                            <Icons.v0 className="size-5" />
                          </a>
                        }
                        variant="outline"
                      />
                    </div>
                    <Suspense
                      fallback={
                        <Skeleton className="min-h-0 flex-1 rounded-lg" />
                      }
                    >
                      <ComponentSource
                        className="flex min-h-0 flex-1 flex-col overflow-hidden *:data-rehype-pretty-code-figure:mt-0"
                        collapsible={false}
                        name={name}
                      />
                    </Suspense>
                  </div>
                </DrawerContent>
              </DrawerPopup>
            </Drawer>
          </div>
        </>
      }
    >
      <div {...{ [previewAttribute]: true }} data-slot="preview">
        <RegistryBlockPreview name={name} previewProps={resolvedPreviewProps} />
      </div>
    </ParticleCardContainer>
  );
}

export function RegistryBlockCardSkeleton({
  className,
  colSpan,
}: {
  className?: string;
  colSpan?: number;
}) {
  return (
    <ParticleCardContainer
      className={className}
      colSpan={colSpan}
      footer={
        <>
          <div className="flex flex-1 items-center gap-1">
            <Skeleton className="size-3 rounded-full" />
            <Skeleton className="h-3 w-48 max-w-full" />
          </div>
          <div className="flex items-center gap-1.5">
            {process.env.NODE_ENV === "development" ? (
              <Skeleton className="h-8 w-20 rounded-md" />
            ) : null}
            <Skeleton className="size-8 rounded-md" />
            <Skeleton className="h-8 w-20 rounded-md" />
          </div>
        </>
      }
    >
      <div data-slot="preview" className="w-full">
        <Skeleton className="h-80 w-full rounded-xl" />
      </div>
    </ParticleCardContainer>
  );
}
