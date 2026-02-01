import { cn } from "@coss/ui/lib/utils";
import type { LucideIcon } from "lucide-react";
import {
  AlertCircleIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  EllipsisIcon,
  InfoIcon,
  MinusIcon,
  PlusIcon,
  PowerIcon,
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
  <Card className="[--radius-2xl:14px]">
    <CardPanel className="px-6 py-4 flex flex-col gap-2">
      <Text className="w-[60%]" />
      <Text className="opacity-0" />
      <Text className="opacity-0" />
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
  <div className="h-7 w-12 bg-muted-foreground/20 rounded-full p-0.5">
    <div className="size-6 bg-card rounded-full" />
  </div>
);

// Select thumbnail - shows a dropdown
export const selectThumbnail = (
  <Card className="[--radius-2xl:14px]">
    <CardPanel className="flex gap-2 p-0">
      <div className="flex flex-1 items-center justify-between gap-2 py-2.5 ps-4 pe-2.5">
        <Text className="w-[60%]" />
        <Icon icon={ChevronDownIcon} />
      </div>
    </CardPanel>
  </Card>
);

// Slider thumbnail - shows a slider track
export const sliderThumbnail = (
  <div className="flex w-full max-w-50 items-center gap-1">
    <Text className="w-[35%] bg-primary" variant="secondary" />
    <div className="size-4 rounded-full bg-primary" />
    <Text className="flex-1" variant="secondary" />
  </div>
);

// Tabs thumbnail - shows tab navigation
export const tabsThumbnail = (
  <div className="max-w-50 flex flex-col gap-4">
    <div className="bg-muted-foreground/12 rounded-lg p-0.5 flex">
      <div className="p-3 bg-card rounded-[calc(var(--radius-lg)-1px)]">
        <Text className="w-6 bg-primary" />
      </div>
      <div className="p-3 rounded-[calc(var(--radius-lg)-1px)]">
        <Text className="w-6" variant="secondary" />
      </div>
      <div className="p-3 rounded-[calc(var(--radius-lg)-1px)]">
        <Text className="w-6" variant="secondary" />
      </div>
    </div>
    <div className="flex flex-col gap-2">
      <Text className="w-[70%]" />
      <Text variant="secondary" />
    </div>
  </div>
);

// Menu thumbnail - shows a menu dropdown
export const menuThumbnail = (
  <div className="flex max-w-50 flex-1 flex-col items-end gap-2">
    <Card className="[--radius-2xl:12px] w-fit">
      <CardPanel className="flex items-center gap-2 p-2">
        <Icon icon={EllipsisIcon} />
      </CardPanel>
    </Card>
    <Card className="[--radius-2xl:10px]">
      <CardPanel className="flex flex-col gap-4 p-4">
        <div className="me-6">
          <Text variant="secondary" className="w-full" />
        </div>
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <Text variant="secondary" />
          </div>
          <Icon icon={ChevronRightIcon} className="-m-1" />
        </div>
        <div className="me-6">
          <Text variant="secondary" className="w-full" />
        </div>
      </CardPanel>
    </Card>
  </div>
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
  <div className="flex max-w-50 flex-1 flex-col items-center gap-2">
    <Card className="[--radius-2xl:12px] w-fit">
      <CardPanel className="flex items-center gap-2 py-3 px-4">
        <Text className="w-12" variant="main" />
      </CardPanel>
    </Card>
    <Card className="[--radius-2xl:10px]">
      <CardPanel className="flex flex-col gap-3 p-4">
        <Text className="w-[70%]" variant="main" />
        <div className="flex flex-col gap-1.5">
          <Text className="w-[80%]" variant="secondary" />
          <Text className="w-[60%]" variant="secondary" />
        </div>
      </CardPanel>
    </Card>
  </div>
);

// Tooltip thumbnail - shows a tooltip
export const tooltipThumbnail = (
  <div className="flex max-w-32 flex-1 flex-col items-center gap-2">
    <Card className="[--radius-2xl:10px]">
      <CardPanel className="p-4">
        <Text />
      </CardPanel>
    </Card>
    <Icon icon={InfoIcon} />
  </div>
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
        <div className="flex items-center gap-2 p-3">
          <Text className="size-2.5 rounded-xs" />
          <Text className="flex-1" />
          <Text className="flex-1" variant="secondary" />
          <Text className="flex-1" variant="secondary" />
          <Text className="flex-1" variant="secondary" />
        </div>
        <div className="flex items-center gap-2 p-3">
          <Text className="size-2.5 rounded-xs" />
          <Text className="flex-1" />
          <Text className="flex-1" variant="secondary" />
          <Text className="flex-1" variant="secondary" />
          <Text className="flex-1" variant="secondary" />
        </div>
        <div className="flex items-center gap-2 p-3">
          <Text className="size-2.5 rounded-xs" />
          <Text className="flex-1" />
          <Text className="flex-1" variant="secondary" />
          <Text className="flex-1" variant="secondary" />
          <Text className="flex-1" variant="secondary" />
        </div>
      </div>
    </CardPanel>
  </Card>
);

// Pagination thumbnail - shows pagination controls
export const paginationThumbnail = (
  <div className="flex flex-1 items-center gap-4">
    <Card className="[--radius-2xl:12px] w-fit">
      <CardPanel className="flex items-center gap-2 p-2">
        <Icon icon={ChevronLeftIcon} />
      </CardPanel>
    </Card>
    <div className="flex flex-1 gap-2">
      <Text className="flex-1" variant="secondary" />
      <Text className="flex-1" variant="secondary" />
      <Text className="flex-1" variant="secondary" />
    </div>
    <Card className="[--radius-2xl:12px] w-fit">
      <CardPanel className="flex items-center gap-2 p-2">
        <Icon icon={ChevronRightIcon} />
      </CardPanel>
    </Card>
  </div>
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
  <div className="max-w-50 flex-1 flex flex-col gap-2">
    <div className="h-2 w-full rounded-full bg-muted-foreground/20">
      <div className="h-2 w-[45%] rounded-s-full bg-primary" />
    </div>
  </div>
);

// Skeleton thumbnail - shows loading skeletons
export const skeletonThumbnail = (
  <div className="max-w-50 flex flex-1 items-center gap-3 mask-[linear-gradient(100deg,black_0%,rgba(0,0,0,0.2)_20%,rgba(0,0,0,0.2)_80%,rgba(0,0,0,0.6)_100%)]">
    <div className="size-8 rounded-full bg-muted-foreground/20" />
    <div className="flex flex-1 flex-col gap-2">
      <Text variant="secondary" className="w-full" />
      <Text variant="secondary" className="w-full" />
    </div>
  </div>
);

// Spinner thumbnail - shows a loading spinner
export const spinnerThumbnail = (
  <div className="size-8 rotate-45 rounded-full border-3 border-muted-foreground/20 border-t-primary" />
);

// Toast thumbnail - shows toast notifications
export const toastThumbnail = (
  <div className="flex-1 relative">
    <Card className="absolute -top-6 scale-80">
      <CardPanel className="flex items-center gap-2 p-3" />
    </Card>
    <Card className="absolute -top-3 scale-90">
      <CardPanel className="flex items-center gap-2 p-3" />
    </Card>
    <Card>
      <CardPanel className="flex items-start gap-2 p-3">
        <Icon icon={AlertCircleIcon} />
        <div className="flex-1 flex flex-col gap-2">
          <Text className="w-[40%]" />
          <Text className="w-[70%]" variant="secondary" />
        </div>
      </CardPanel>
    </Card>
  </div>
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
  <Card className="max-w-50">
    <CardPanel className="divide-y divide-border p-0">
      <div className="flex items-center gap-2 px-4 py-3">
        <Icon icon={SearchIcon} />
        <Text className="w-[40%]" />
      </div>
      <div className="flex flex-col gap-4 p-4">
        <div className="flex items-center justify-between gap-2">
          <Text variant="secondary" className="w-[65%]" />
          <Text variant="secondary" className="w-4" />
        </div>
        <div className="flex items-center justify-between gap-2">
          <Text variant="secondary" className="w-[65%]" />
          <Text variant="secondary" className="w-4" />
        </div>
        <div className="flex items-center justify-between gap-2">
          <Text variant="secondary" className="w-[65%]" />
          <Text variant="secondary" className="w-4" />
        </div>
      </div>
    </CardPanel>
  </Card>
);

// Sheet thumbnail - shows a side sheet
export const sheetThumbnail = (
  <div className="flex-1 h-full flex gap-2">
    <div className="flex-1 rounded-xl border border-dashed"></div>
    <Card className="max-w-20 h-full [--radius-2xl:14px]">
      <CardPanel className="flex flex-col gap-4 p-3">
        <div className="flex flex-1 flex-col gap-2">
          <Text className="w-[60%]" variant="main" />
          <Text variant="secondary" />
        </div>
        <div className="flex items-center justify-end gap-2">
          <Button variant="primary" />
        </div>
      </CardPanel>
    </Card>
  </div>
);

// Separator thumbnail - shows a divider
export const separatorThumbnail = (
  <div className="max-w-50 flex-1 divide-y">
    <div className="flex flex-col gap-2 py-3">
      <Text className="w-[60%]" />
      <Text variant="secondary" />
    </div>
    <div className="flex items-center gap-2 divide-x py-3">
      <div className="px-2 py-1 flex-1 -mx-2">
        <Text variant="secondary" />
      </div>
      <div className="px-2 py-1 flex-1">
        <Text variant="secondary" />
      </div>
      <div className="px-2 py-1 flex-1 -mx-2">
        <Text variant="secondary" />
      </div>
      <div className="px-2 py-1 flex-1">
        <Text variant="secondary" />
      </div>
    </div>
  </div>
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
  <div className="max-w-50 flex-1 flex flex-col gap-2">
    <div className="flex items-center justify-between">
      <Text className="w-[50%]" />
      <Text className="w-8" />
    </div>
    <div className="h-2 w-full rounded-full bg-muted-foreground/20">
      <div className="h-2 w-[65%] rounded-s-full bg-primary" />
    </div>
  </div>
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
  <Card className="[--radius-2xl:14px] w-fit">
    <CardPanel className="flex items-center gap-2 p-2.75">
      <Icon icon={PowerIcon} />
    </CardPanel>
  </Card>
);

// Toggle group thumbnail - shows grouped toggles
export const toggleGroupThumbnail = (
  <Card className="w-auto flex-row divide-x [--radius-2xl:14px]">
    <CardPanel className="bg-clip-padding p-4">
      <Text className="w-4" />
    </CardPanel>
    <CardPanel className="bg-clip-padding p-4 bg-muted-foreground/8">
      <Text className="w-4 bg-foreground" />
    </CardPanel>
    <CardPanel className="bg-clip-padding p-4">
      <Text className="w-4" />
    </CardPanel>
  </Card>
);

// Toolbar thumbnail - shows toolbar buttons
export const toolbarThumbnail = (
  <div className="flex items-center gap-1 p-1 border rounded-xl">
    <Card className="[--radius-2xl:12px] w-fit">
      <CardPanel className="p-3.5">
        <Text className="w-4" />
      </CardPanel>
    </Card>
    <Card className="[--radius-2xl:12px] w-fit">
      <CardPanel className="p-3.5">
        <Text className="w-4" />
      </CardPanel>
    </Card>
    <Card className="[--radius-2xl:12px] w-fit">
      <CardPanel className="p-3.5">
        <Text className="w-4" />
      </CardPanel>
    </Card>
  </div>
);

// Scroll area thumbnail - shows scrollable content
export const scrollAreaThumbnail = (
  <Card className="[--radius-2xl:14px] max-w-36">
    <CardPanel className="relative p-0">
      <div className="flex flex-col gap-2 p-3">
        <Text variant="secondary" className="w-[80%]" />
        <Text variant="secondary" className="w-[90%]" />
        <Text variant="secondary" className="w-[70%]" />
        <Text variant="secondary" className="w-[85%]" />
        <Text variant="secondary" className="w-[90%]" />
        <Text variant="secondary" className="w-[80%]" />
      </div>
      <div className="absolute top-2 right-1 h-8 w-1 rounded-full bg-muted-foreground/40" />
    </CardPanel>
  </Card>
);

// Empty thumbnail - shows empty state
export const emptyThumbnail = (
  <Card className="border-dashed bg-transparent shadow-none before:hidden">
    <CardPanel className="flex flex-col items-center gap-2">
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
  <Card className="max-w-50">
    <CardPanel className="p-4 flex items-center gap-3">
      <div className="size-9 shrink-0 rounded-full bg-muted-foreground/20"></div>
      <div className="flex-1 flex flex-col gap-2">
        <Text className="w-[70%]" variant="main" />
        <Text variant="secondary" />
        <Text className="w-[90%]" variant="secondary" />
      </div>
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
        <Text className="w-[40%]" />
        <Icon icon={TextCursorIcon} />
      </CardPanel>
    </Card>
    <Card className="[--radius-2xl:10px]">
      <CardPanel className="flex flex-col gap-4 p-4">
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
