import { cn } from "@coss/ui/lib/utils";
import type { LucideIcon } from "lucide-react";
import { AlertCircleIcon, ChevronDownIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Card as BaseCard, CardPanel } from "@/registry/default/ui/card";

function Icon({
  icon: IconComponent,
  className,
}: {
  icon: LucideIcon;
  className?: string;
}) {
  return (
    <IconComponent
      className={cn("size-4 text-muted-foreground/88", className)}
    />
  );
}

function Text({
  className,
  variant = "main",
}: {
  className?: string;
  variant?: "main" | "secondary";
}) {
  const bgColor =
    variant === "main" ? "bg-muted-foreground/40" : "bg-muted-foreground/20";
  return <div className={cn("h-1.5 rounded-full", bgColor, className)} />;
}

function Button({
  variant = "secondary",
}: {
  variant?: "primary" | "secondary";
}) {
  const height = variant === "primary" ? "h-4" : "h-1.5";
  const bgColor =
    variant === "primary" ? "bg-muted-foreground/40" : "bg-muted-foreground/20";
  return <div className={cn(height, "w-7 rounded-sm", bgColor)} />;
}

function Card({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <BaseCard className={cn("w-full shadow-md/3", className)}>
      {children}
    </BaseCard>
  );
}

// Thumbnail implementations
export const accordionThumbnail = (
  <Card className="max-w-50">
    <CardPanel className="divide-y divide-border p-0">
      <div className="p-3">
        <div className="flex items-center gap-2">
          <Icon icon={ChevronDownIcon} />
          <Text className="w-[60%]" />
        </div>
      </div>
      <div className="p-3">
        <div className="flex items-center gap-2">
          <Icon className="rotate-180" icon={ChevronDownIcon} />
          <div className="flex flex-1 flex-col gap-2">
            <Text className="w-[50%]" variant="main" />
            <Text className="w-[90%]" variant="secondary" />
          </div>
        </div>
      </div>
      <div className="p-3">
        <div className="flex items-center gap-2">
          <Icon icon={ChevronDownIcon} />
          <Text className="w-[60%]" />
        </div>
      </div>
    </CardPanel>
  </Card>
);

export const alertThumbnail = (
  <Card>
    <CardPanel className="divide-y divide-border p-3">
      <div className="flex items-center gap-2">
        <Icon icon={AlertCircleIcon} />
        <Text className="w-[70%]" variant="secondary" />
      </div>
    </CardPanel>
  </Card>
);

export const alertDialogThumbnail = (
  <Card className="max-w-50">
    <CardPanel className="flex flex-col gap-5 px-4 py-5">
      <div className="flex flex-col gap-2">
        <Text className="w-[50%]" variant="main" />
        <Text className="w-[90%]" variant="secondary" />
      </div>
      <div className="flex items-center justify-end gap-2">
        <Button variant="secondary" />
        <Button variant="primary" />
      </div>
    </CardPanel>
  </Card>
);

/**
 * Map of category slugs to their thumbnail components.
 * Add new thumbnails here as they are created.
 */
export const categoryThumbnails: Record<string, ReactNode> = {
  accordion: accordionThumbnail,
  alert: alertThumbnail,
  "alert-dialog": alertDialogThumbnail,
};

/**
 * Get the thumbnail for a category by slug.
 * Returns undefined if no thumbnail exists for the given slug.
 */
export function getCategoryThumbnail(slug: string): ReactNode | undefined {
  return categoryThumbnails[slug];
}
