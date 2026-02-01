import { cn } from "@coss/ui/lib/utils";
import type { LucideIcon } from "lucide-react";
import {
  AlertCircleIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  MinusIcon,
  PlusIcon,
  SearchIcon,
  TextCursorIcon,
  UserRoundIcon,
  XIcon,
} from "lucide-react";
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
  className,
}: {
  variant?: "primary" | "secondary";
  className?: string;
}) {
  const height = variant === "primary" ? "h-4" : "h-1.5";
  const bgColor =
    variant === "primary" ? "bg-primary" : "bg-muted-foreground/20";
  return <div className={cn(height, "w-7 rounded-sm", bgColor, className)} />;
}

function Card({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <BaseCard className={cn("w-full max-w-72 shadow-md/3", className)}>
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
    <CardPanel className="flex items-center gap-2 p-3">
      <Icon icon={AlertCircleIcon} />
      <Text className="w-[70%]" variant="secondary" />
    </CardPanel>
  </Card>
);

export const alertDialogThumbnail = (
  <Card className="max-w-50">
    <CardPanel className="flex flex-col gap-5 p-4">
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

// Button thumbnail - shows a simple button
export const buttonThumbnail = (
  <Card className="max-w-24 bg-primary [--radius-2xl:14px]">
    <CardPanel className="px-6 py-4">
      <Text className="bg-primary-foreground/40" />
    </CardPanel>
  </Card>
);

// Input thumbnail - shows an input field
export const inputThumbnail = (
  <Card className="[--radius-2xl:14px]">
    <CardPanel className="px-6 py-4">
      <Text className="w-[60%]" />
    </CardPanel>
  </Card>
);

// Textarea thumbnail - shows multiple lines
export const textareaThumbnail = (
  <Card>
    <CardPanel className="p-3">
      <div className="flex flex-col gap-1.5 rounded border border-border bg-background p-2">
        <Text className="w-full" />
        <Text className="w-[90%]" variant="secondary" />
        <Text className="w-[80%]" variant="secondary" />
      </div>
    </CardPanel>
  </Card>
);

// Checkbox thumbnail - shows checkboxes
export const checkboxThumbnail = (
  <div className="flex max-w-28 flex-1 flex-col gap-3">
    <div className="flex items-center gap-2">
      <div className="size-4 shrink-0 rounded bg-muted-foreground/20" />
      <Text className="w-full" variant="secondary" />
    </div>
    <div className="flex items-center gap-2">
      <div className="size-4 shrink-0 rounded bg-primary" />
      <Text className="w-full" variant="secondary" />
    </div>
  </div>
);

// Radio group thumbnail - shows radio buttons
export const radioGroupThumbnail = (
  <div className="flex max-w-28 flex-1 flex-col gap-3">
    <div className="flex items-center gap-2">
      <div className="size-4 shrink-0 rounded-full bg-muted-foreground/20" />
      <Text className="w-full" variant="secondary" />
    </div>
    <div className="flex items-center gap-2">
      <div className="size-4 shrink-0 rounded-full bg-primary" />
      <Text className="w-full" variant="secondary" />
    </div>
  </div>
);

// Switch thumbnail - shows toggle switches
export const switchThumbnail = (
  <Card>
    <CardPanel className="flex flex-col gap-3 p-3">
      <div className="flex items-center justify-between">
        <Text className="w-[50%]" />
        <div className="h-5 w-9 rounded-full bg-muted-foreground/40" />
      </div>
      <div className="flex items-center justify-between">
        <Text className="w-[60%]" />
        <div className="h-5 w-9 rounded-full bg-muted-foreground/20" />
      </div>
    </CardPanel>
  </Card>
);

// Select thumbnail - shows a dropdown
export const selectThumbnail = (
  <Card>
    <CardPanel className="p-3">
      <div className="flex items-center justify-between rounded border border-border bg-background p-2">
        <Text className="w-[60%]" />
        <Icon icon={ChevronDownIcon} />
      </div>
    </CardPanel>
  </Card>
);

// Slider thumbnail - shows a slider track
export const sliderThumbnail = (
  <div className="flex w-full max-w-50 items-center gap-2">
    <Text className="w-[30%] bg-primary" variant="secondary" />
    <div className="size-4 rounded-full bg-primary" />
    <Text className="flex-1" variant="secondary" />
  </div>
);

// Tabs thumbnail - shows tab navigation
export const tabsThumbnail = (
  <Card>
    <CardPanel className="p-0">
      <div className="flex border-border border-b">
        <div className="border-muted-foreground/40 border-b-2 px-3 py-2">
          <Text className="w-12" />
        </div>
        <div className="px-3 py-2">
          <Text className="w-10" variant="secondary" />
        </div>
        <div className="px-3 py-2">
          <Text className="w-14" variant="secondary" />
        </div>
      </div>
      <div className="p-3">
        <Text className="w-[80%]" />
      </div>
    </CardPanel>
  </Card>
);

// Menu thumbnail - shows a menu dropdown
export const menuThumbnail = (
  <Card className="max-w-50">
    <CardPanel className="divide-y divide-border p-0">
      <div className="p-2">
        <Text className="w-[70%]" />
      </div>
      <div className="p-2">
        <Text className="w-[60%]" />
      </div>
      <div className="p-2">
        <Text className="w-[80%]" variant="secondary" />
      </div>
    </CardPanel>
  </Card>
);

// Dialog thumbnail - similar to alert-dialog but simpler
export const dialogThumbnail = (
  <Card className="max-w-36 [--radius-2xl:14px]">
    <CardPanel className="flex flex-col gap-4 p-4">
      <div className="flex flex-col gap-2">
        <Text className="w-[60%]" variant="main" />
      </div>
      <div className="flex flex-col gap-2">
        <div className="h-4 rounded-sm bg-muted-foreground/20" />
        <div className="h-4 rounded-sm bg-muted-foreground/20" />
      </div>
      <div className="flex items-center justify-end gap-2">
        <Button variant="secondary" />
        <Button variant="primary" />
      </div>
    </CardPanel>
  </Card>
);

// Popover thumbnail - shows a popover with content
export const popoverThumbnail = (
  <Card className="max-w-50">
    <CardPanel className="flex flex-col gap-3 p-3">
      <Text className="w-[70%]" variant="main" />
      <div className="flex flex-col gap-1.5">
        <Text className="w-[80%]" variant="secondary" />
        <Text className="w-[60%]" variant="secondary" />
      </div>
    </CardPanel>
  </Card>
);

// Tooltip thumbnail - shows a tooltip
export const tooltipThumbnail = (
  <Card>
    <CardPanel className="flex items-center justify-center p-4">
      <div className="relative">
        <div className="rounded bg-muted-foreground/40 px-2 py-1">
          <Text className="w-16" />
        </div>
        <div className="-bottom-1 -translate-x-1/2 absolute left-1/2 size-2 rotate-45 bg-muted-foreground/40" />
      </div>
    </CardPanel>
  </Card>
);

// Badge thumbnail - shows badges
export const badgeThumbnail = (
  <Card className="max-w-24 [--radius-2xl:9999px]">
    <CardPanel className="flex items-center gap-2 px-2.5 py-2">
      <div className="size-2 rounded-full bg-muted-foreground/88" />
      <Text className="flex-1" />
    </CardPanel>
  </Card>
);

// Avatar thumbnail - shows avatar circles
export const avatarThumbnail = (
  <Card className="size-12 [--radius-2xl:9999px]">
    <CardPanel className="flex items-center justify-center p-1">
      <div className="flex size-full items-center justify-center rounded-full border border-border/64">
        <Icon icon={UserRoundIcon} />
      </div>
    </CardPanel>
  </Card>
);

// Card thumbnail - shows nested cards
export const cardThumbnail = (
  <Card className="max-w-36 [--radius-2xl:14px]">
    <CardPanel className="flex flex-col gap-4 p-4">
      <div className="flex flex-col gap-2">
        <Text className="w-[60%]" variant="main" />
        <Text className="w-[90%]" variant="secondary" />
      </div>
      <div className="flex flex-col gap-2">
        <div className="h-4 rounded-sm bg-muted-foreground/20" />
        <div className="h-4 rounded-sm bg-muted-foreground/20" />
        <Button className="w-full rounded-sm" variant="primary" />
      </div>
    </CardPanel>
  </Card>
);

// Table thumbnail - shows a table structure
export const tableThumbnail = (
  <Card>
    <CardPanel className="p-0">
      <div className="divide-y divide-border">
        <div className="flex gap-2 border-border border-b bg-muted-foreground/10 p-2">
          <Text className="w-[30%]" variant="main" />
          <Text className="w-[25%]" variant="main" />
          <Text className="w-[20%]" variant="main" />
        </div>
        <div className="flex gap-2 p-2">
          <Text className="w-[30%]" />
          <Text className="w-[25%]" />
          <Text className="w-[20%]" />
        </div>
        <div className="flex gap-2 p-2">
          <Text className="w-[30%]" />
          <Text className="w-[25%]" />
          <Text className="w-[20%]" />
        </div>
      </div>
    </CardPanel>
  </Card>
);

// Pagination thumbnail - shows pagination controls
export const paginationThumbnail = (
  <Card>
    <CardPanel className="flex items-center justify-center gap-1 p-3">
      <Button variant="secondary" />
      <div className="size-6 rounded bg-muted-foreground/40" />
      <div className="size-6 rounded bg-muted-foreground/20" />
      <div className="size-6 rounded bg-muted-foreground/20" />
      <Button variant="secondary" />
    </CardPanel>
  </Card>
);

// Breadcrumb thumbnail - shows breadcrumb navigation
export const breadcrumbThumbnail = (
  <Card>
    <CardPanel className="flex items-center gap-1 p-3">
      <Text className="flex-1" />
      <Icon icon={ChevronRightIcon} />
      <Text className="flex-1" variant="secondary" />
      <Icon icon={ChevronRightIcon} />
      <Text className="flex-1" variant="secondary" />
    </CardPanel>
  </Card>
);

// Progress thumbnail - shows a progress bar
export const progressThumbnail = (
  <Card>
    <CardPanel className="flex flex-col gap-2 p-3">
      <div className="flex w-full items-center gap-2">
        <div className="h-2 flex-1 rounded-full bg-muted-foreground/20" />
        <Text className="w-8" />
      </div>
      <div className="h-2 w-[60%] rounded-full bg-muted-foreground/40" />
    </CardPanel>
  </Card>
);

// Skeleton thumbnail - shows loading skeletons
export const skeletonThumbnail = (
  <Card>
    <CardPanel className="flex flex-col gap-2 p-3">
      <div className="h-4 w-[70%] rounded bg-muted-foreground/20" />
      <div className="h-4 w-[90%] rounded bg-muted-foreground/20" />
      <div className="h-4 w-[60%] rounded bg-muted-foreground/20" />
    </CardPanel>
  </Card>
);

// Spinner thumbnail - shows a loading spinner
export const spinnerThumbnail = (
  <div className="size-6 animate-spin rounded-full border-2 border-muted-foreground/20 border-t-muted-foreground/40" />
);

// Toast thumbnail - shows toast notifications
export const toastThumbnail = (
  <Card className="max-w-50">
    <CardPanel className="flex items-center justify-between p-3">
      <div className="flex flex-1 items-center gap-2">
        <Icon icon={AlertCircleIcon} />
        <Text className="w-[70%]" />
      </div>
      <div className="size-4 rounded border border-border" />
    </CardPanel>
  </Card>
);

// Combobox thumbnail - shows a combobox input
export const comboboxThumbnail = (
  <Card className="[--radius-2xl:14px]">
    <CardPanel className="flex items-center gap-2 px-3 py-[calc(--spacing(2.5)-1px)]">
      <div className="flex h-5 items-center gap-1 rounded-sm bg-muted-foreground/20 py-0.5 ps-2 pe-1">
        <Text className="w-6" />
        <Icon icon={XIcon} />
      </div>
      <div className="flex h-5 items-center gap-1 rounded-sm bg-muted-foreground/20 py-0.5 ps-2 pe-1">
        <Text className="w-6" />
        <Icon icon={XIcon} />
      </div>
    </CardPanel>
  </Card>
);

// Command thumbnail - shows command palette
export const commandThumbnail = (
  <Card>
    <CardPanel className="divide-y divide-border p-0">
      <div className="flex items-center gap-2 px-4 py-3">
        <Icon icon={SearchIcon} />
        <Text className="w-[60%]" />
      </div>
      <div className="flex flex-col gap-4 p-4">
        <Text variant="secondary" />
        <Text variant="secondary" />
        <Text variant="secondary" />
      </div>
    </CardPanel>
  </Card>
);

// Sheet thumbnail - shows a side sheet
export const sheetThumbnail = (
  <Card className="max-w-50">
    <CardPanel className="flex flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <Text className="w-[50%]" variant="main" />
        <div className="size-4 rounded border border-border" />
      </div>
      <div className="flex flex-col gap-2">
        <Text className="w-[80%]" />
        <Text className="w-[90%]" variant="secondary" />
        <Text className="w-[70%]" variant="secondary" />
      </div>
    </CardPanel>
  </Card>
);

// Separator thumbnail - shows a divider
export const separatorThumbnail = (
  <Card>
    <CardPanel className="flex flex-col gap-3 p-3">
      <Text className="w-[70%]" />
      <div className="h-px bg-border" />
      <Text className="w-[60%]" variant="secondary" />
    </CardPanel>
  </Card>
);

// Collapsible thumbnail - shows collapsible content
export const collapsibleThumbnail = (
  <Card>
    <CardPanel className="divide-y divide-border p-0">
      <div className="flex items-center justify-between px-4 py-3">
        <Text className="w-[60%]" />
        <Icon icon={ChevronDownIcon} />
      </div>
      <div className="flex flex-col gap-2 p-4">
        <Text className="w-[80%]" variant="secondary" />
        <Text className="w-[70%]" variant="secondary" />
      </div>
    </CardPanel>
  </Card>
);

// Form thumbnail - shows form fields
export const formThumbnail = (
  <div className="flex max-w-50 flex-1 flex-col gap-4">
    <div className="flex flex-col gap-2">
      <Text className="w-16" />
      <Card className="[--radius-2xl:10px]">
        <CardPanel className="py-3.5" />
      </Card>
    </div>
    <Card className="bg-primary [--radius-2xl:10px]">
      <CardPanel className="py-3.5" />
    </Card>
  </div>
);

// Field thumbnail - shows a form field
export const fieldThumbnail = (
  <div className="flex max-w-50 flex-1 flex-col gap-3">
    <Text className="w-16" />
    <Card className="[--radius-2xl:10px]">
      <CardPanel className="py-3.5" />
    </Card>
    <Text className="w-[80%]" variant="secondary" />
  </div>
);

// Fieldset thumbnail - shows grouped fields
export const fieldsetThumbnail = (
  <div className="flex max-w-50 flex-1 flex-col gap-4">
    <div className="flex flex-col gap-2">
      <Text className="w-16" />
      <Card className="[--radius-2xl:10px]">
        <CardPanel className="py-3.5" />
      </Card>
    </div>
    <div className="flex flex-col gap-2">
      <Text className="w-16" />
      <Card className="[--radius-2xl:10px]">
        <CardPanel className="py-3.5" />
      </Card>
    </div>
  </div>
);

// Label thumbnail - shows labels
export const labelThumbnail = (
  <div className="flex max-w-50 flex-1 flex-col gap-3">
    <Text className="w-16 bg-primary" />
    <Card className="[--radius-2xl:10px]">
      <CardPanel className="py-3.5" />
    </Card>
  </div>
);

// Meter thumbnail - shows a meter/progress
export const meterThumbnail = (
  <Card>
    <CardPanel className="flex flex-col gap-2 p-3">
      <div className="flex items-center justify-between">
        <Text className="w-[50%]" />
        <Text className="w-12" />
      </div>
      <div className="h-3 w-full rounded-full bg-muted-foreground/20">
        <div className="h-3 w-[65%] rounded-full bg-muted-foreground/40" />
      </div>
    </CardPanel>
  </Card>
);

// Number field thumbnail - shows number input
export const numberFieldThumbnail = (
  <Card className="[--radius-2xl:14px]">
    <CardPanel className="flex items-center gap-2 px-4 py-2.5">
      <Icon className="shrink-0" icon={MinusIcon} />
      <div className="flex flex-1 justify-center">
        <Text className="w-12" />
      </div>
      <Icon className="shrink-0" icon={PlusIcon} />
    </CardPanel>
  </Card>
);

// Toggle thumbnail - shows toggle buttons
export const toggleThumbnail = (
  <Card>
    <CardPanel className="flex items-center gap-2 p-3">
      <div className="rounded bg-muted-foreground/40 px-3 py-1">
        <Text className="w-12" />
      </div>
      <div className="rounded bg-muted-foreground/20 px-3 py-1">
        <Text className="w-10" variant="secondary" />
      </div>
    </CardPanel>
  </Card>
);

// Toggle group thumbnail - shows grouped toggles
export const toggleGroupThumbnail = (
  <Card>
    <CardPanel className="flex items-center gap-1 p-3">
      <div className="rounded bg-muted-foreground/40 px-2 py-1">
        <Text className="w-8" />
      </div>
      <div className="rounded bg-muted-foreground/20 px-2 py-1">
        <Text className="w-8" variant="secondary" />
      </div>
      <div className="rounded bg-muted-foreground/20 px-2 py-1">
        <Text className="w-8" variant="secondary" />
      </div>
    </CardPanel>
  </Card>
);

// Toolbar thumbnail - shows toolbar buttons
export const toolbarThumbnail = (
  <Card>
    <CardPanel className="flex items-center gap-1 border border-border p-2">
      <Button variant="secondary" />
      <div className="h-4 w-px bg-border" />
      <Button variant="secondary" />
      <Button variant="secondary" />
      <div className="h-4 w-px bg-border" />
      <Button variant="secondary" />
    </CardPanel>
  </Card>
);

// Scroll area thumbnail - shows scrollable content
export const scrollAreaThumbnail = (
  <Card>
    <CardPanel className="relative p-0">
      <div className="flex flex-col gap-2 p-3">
        <Text className="w-[80%]" />
        <Text className="w-[90%]" />
        <Text className="w-[70%]" />
        <Text className="w-[85%]" />
      </div>
      <div className="absolute top-2 right-1 h-8 w-1 rounded-full bg-muted-foreground/20" />
    </CardPanel>
  </Card>
);

// Empty thumbnail - shows empty state
export const emptyThumbnail = (
  <Card className="border-dashed bg-transparent shadow-none before:hidden">
    <CardPanel className="flex flex-col items-center gap-2 p-4">
      <div className="size-8 rounded-full bg-muted-foreground/20" />
      <Text className="w-[60%]" />
      <Text className="w-[80%]" variant="secondary" />
    </CardPanel>
  </Card>
);

// Frame thumbnail - shows a frame container
export const frameThumbnail = (
  <div className="flex-1 rounded-[calc(var(--radius-2xl)+2px)] bg-muted/72 p-1">
    <div className="flex flex-col gap-2 p-4">
      <Text className="w-[70%]" />
    </div>
    <Card>
      <CardPanel className="p-5">
        <div className="flex flex-col gap-2">
          <Text className="w-[70%]" />
          <Text className="w-[90%]" variant="secondary" />
        </div>
      </CardPanel>
    </Card>
  </div>
);

// Group thumbnail - shows grouped elements
export const groupThumbnail = (
  <Card className="max-w-48 flex-row divide-x [--radius-2xl:14px]">
    <CardPanel className="px-6 py-4">
      <Text />
    </CardPanel>
    <CardPanel className="px-6 py-4">
      <Text />
    </CardPanel>
  </Card>
);

// Input group thumbnail - shows input with buttons
export const inputGroupThumbnail = (
  <Card className="[--radius-2xl:14px]">
    <CardPanel className="flex gap-2 p-0">
      <div className="flex flex-1 items-center gap-2 py-2.5 ps-4">
        <Icon icon={SearchIcon} />
        <Text className="w-[60%]" />
      </div>
      <div className="flex items-center py-2.5 pe-4">
        <div className="size-4 shrink-0 rounded bg-muted-foreground/20" />
      </div>
    </CardPanel>
  </Card>
);

// Preview card thumbnail - shows a preview card
export const previewCardThumbnail = (
  <Card>
    <CardPanel className="flex flex-col gap-3 p-3">
      <Text className="w-[70%]" variant="main" />
      <Text className="w-[90%]" variant="secondary" />
    </CardPanel>
  </Card>
);

// Kbd thumbnail - shows keyboard keys
export const kbdThumbnail = (
  <div className="flex items-center justify-center gap-2">
    <Card className="size-10 [--radius-2xl:10px]">
      <CardPanel className="flex items-center justify-center p-0 text-muted-foreground/88 leading-none">
        ⌘
      </CardPanel>
    </Card>
    <Card className="size-10 [--radius-2xl:10px]">
      <CardPanel className="flex items-center justify-center p-0 text-muted-foreground/88 leading-none">
        K
      </CardPanel>
    </Card>
  </div>
);

// Autocomplete thumbnail - shows autocomplete input
export const autocompleteThumbnail = (
  <div className="flex max-w-50 flex-1 flex-col gap-2">
    <Card className="[--radius-2xl:12px]">
      <CardPanel className="flex items-center gap-2 px-4 py-2">
        <Text className="w-[60%]" />
        <Icon icon={TextCursorIcon} />
      </CardPanel>
    </Card>
    <Card className="[--radius-2xl:10px]">
      <CardPanel className="flex flex-col gap-4 px-4 py-4">
        <Text variant="secondary" />
        <Text variant="secondary" />
        <Text variant="secondary" />
      </CardPanel>
    </Card>
  </div>
);

// Checkbox group thumbnail - shows multiple checkboxes
export const checkboxGroupThumbnail = (
  <div className="flex max-w-28 flex-1 flex-col gap-3">
    <div className="flex items-center gap-2">
      <div className="size-4 shrink-0 rounded bg-primary" />
      <Text className="w-full" variant="secondary" />
    </div>
    <div className="flex items-center gap-2 ps-4">
      <div className="size-4 shrink-0 rounded bg-muted-foreground/20" />
      <Text className="w-full" variant="secondary" />
    </div>
    <div className="flex items-center gap-2 ps-4">
      <div className="size-4 shrink-0 rounded bg-primary" />
      <Text className="w-full" variant="secondary" />
    </div>
    <div className="flex items-center gap-2">
      <div className="size-4 shrink-0 rounded bg-muted-foreground/20" />
      <Text className="w-full" variant="secondary" />
    </div>
  </div>
);

/**
 * Map of category slugs to their thumbnail components.
 * Add new thumbnails here as they are created.
 */
export const categoryThumbnails: Record<string, ReactNode> = {
  accordion: accordionThumbnail,
  alert: alertThumbnail,
  "alert-dialog": alertDialogThumbnail,
  autocomplete: autocompleteThumbnail,
  avatar: avatarThumbnail,
  badge: badgeThumbnail,
  breadcrumb: breadcrumbThumbnail,
  button: buttonThumbnail,
  card: cardThumbnail,
  checkbox: checkboxThumbnail,
  "checkbox-group": checkboxGroupThumbnail,
  collapsible: collapsibleThumbnail,
  combobox: comboboxThumbnail,
  command: commandThumbnail,
  dialog: dialogThumbnail,
  empty: emptyThumbnail,
  field: fieldThumbnail,
  fieldset: fieldsetThumbnail,
  form: formThumbnail,
  frame: frameThumbnail,
  group: groupThumbnail,
  input: inputThumbnail,
  "input-group": inputGroupThumbnail,
  kbd: kbdThumbnail,
  label: labelThumbnail,
  menu: menuThumbnail,
  meter: meterThumbnail,
  "number-field": numberFieldThumbnail,
  pagination: paginationThumbnail,
  popover: popoverThumbnail,
  "preview-card": previewCardThumbnail,
  progress: progressThumbnail,
  "radio-group": radioGroupThumbnail,
  "scroll-area": scrollAreaThumbnail,
  select: selectThumbnail,
  separator: separatorThumbnail,
  sheet: sheetThumbnail,
  skeleton: skeletonThumbnail,
  slider: sliderThumbnail,
  spinner: spinnerThumbnail,
  switch: switchThumbnail,
  table: tableThumbnail,
  tabs: tabsThumbnail,
  textarea: textareaThumbnail,
  toast: toastThumbnail,
  toggle: toggleThumbnail,
  "toggle-group": toggleGroupThumbnail,
  toolbar: toolbarThumbnail,
  tooltip: tooltipThumbnail,
};

/**
 * Get the thumbnail for a category by slug.
 * Returns undefined if no thumbnail exists for the given slug.
 */
export function getCategoryThumbnail(slug: string): ReactNode | undefined {
  return categoryThumbnails[slug];
}
