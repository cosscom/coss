"use client";

import { LoaderCircleIcon } from "lucide-react";
import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import type { RegistryItem } from "shadcn/registry";

interface ComponentLoaderProps {
  component: RegistryItem;
}

export default function ComponentLoader<TProps extends object>({
  component,
  ...props
}: ComponentLoaderProps & TProps) {
  if (!component.files?.length) {
    return null;
  }
  const path = component.files[0].path;
  const newPath = path.replace("registry/", "");
  const Component = dynamic(
    () => import(`@/registry/${newPath}`).catch(() => () => null),
    {
      loading: () => (
        <div
          className="peer flex min-h-20 items-center justify-center"
          data-comp-loading="true"
        >
          <span className="sr-only">Loading component...</span>
          <LoaderCircleIcon
            aria-hidden="true"
            className="-ms-1 animate-spin text-input"
            size={24}
          />
        </div>
      ),
      ssr: false,
    },
  ) as ComponentType<TProps>;

  return <Component {...(props as TProps)} currentPage={1} totalPages={10} />;
}
