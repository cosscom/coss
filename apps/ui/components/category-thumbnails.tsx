"use client";

import { cn } from "@coss/ui/lib/utils";
import { motion } from "framer-motion";
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
  SearchIcon,
  TextCursorIcon,
  UserRoundIcon,
  XIcon,
} from "lucide-react";
import type { ReactNode } from "react";

// ============================================================================
// Animation Variants
// ============================================================================

const iconVariants = {
  rest: { scale: 1, rotate: 0 },
  hover: {
    scale: 1.1,
    transition: { duration: 0.2, ease: "easeOut" },
  },
};

const chevronVariants = {
  rest: { rotate: 0 },
  hover: {
    rotate: 180,
    transition: { duration: 0.3, ease: "easeInOut" },
  },
};

const textVariants = {
  rest: { scaleX: 1 },
  hover: {
    scaleX: 1.02,
    transition: { duration: 0.2, ease: "easeOut" },
  },
};

const buttonVariants = {
  rest: { scale: 1 },
  hover: {
    scale: 1.05,
    transition: { duration: 0.2, ease: "easeOut" },
  },
};

const cardVariants = {
  rest: { y: 0 },
  hover: {
    y: -2,
    transition: { duration: 0.2, ease: "easeOut" },
  },
};

const pulseVariants = {
  rest: { opacity: 1 },
  hover: {
    opacity: [1, 0.7, 1],
    transition: { duration: 0.8, repeat: Infinity, ease: "easeInOut" },
  },
};

const slideVariants = {
  rest: { x: 0 },
  hover: {
    x: 2,
    transition: { duration: 0.2, ease: "easeOut" },
  },
};

const toggleVariants = {
  rest: { x: 0 },
  hover: {
    x: 16,
    transition: { duration: 0.3, ease: "easeInOut" },
  },
};

const progressVariants = {
  rest: { scaleX: 1 },
  hover: {
    scaleX: 1.15,
    transition: { duration: 0.4, ease: "easeOut" },
  },
};

const spinnerVariants = {
  rest: { rotate: 45 },
  hover: {
    rotate: 405,
    transition: { duration: 0.8, ease: "easeInOut" },
  },
};

// ============================================================================
// Base Components
// ============================================================================

function Icon({
  icon: IconComponent,
  className,
  animate = true,
}: {
  icon: LucideIcon;
  className?: string;
  animate?: boolean;
}) {
  if (!animate) {
    return (
      <IconComponent
        className={cn("size-4 text-muted-foreground/88", className)}
      />
    );
  }
  return (
    <motion.div variants={iconVariants} className="flex items-center justify-center">
      <IconComponent
        className={cn("size-4 text-muted-foreground/88", className)}
      />
    </motion.div>
  );
}

function ChevronIcon({
  direction = "down",
  className,
  animated = true,
}: {
  direction?: "down" | "up" | "left" | "right";
  className?: string;
  animated?: boolean;
}) {
  const icons = {
    down: ChevronDownIcon,
    up: ChevronDownIcon,
    left: ChevronLeftIcon,
    right: ChevronRightIcon,
  };
  const IconComponent = icons[direction];
  const rotation = direction === "up" ? 180 : 0;

  if (!animated) {
    return (
      <IconComponent
        className={cn("size-4 text-muted-foreground/88", className)}
        style={{ transform: `rotate(${rotation}deg)` }}
      />
    );
  }

  return (
    <motion.div
      variants={chevronVariants}
      className="flex items-center justify-center"
      style={{ rotate: rotation }}
    >
      <IconComponent
        className={cn("size-4 text-muted-foreground/88", className)}
      />
    </motion.div>
  );
}

function Text({
  className,
  variant = "main",
  animate = false,
}: {
  className?: string;
  variant?: "main" | "secondary";
  animate?: boolean;
}) {
  const bgColor =
    variant === "main" ? "bg-muted-foreground/40" : "bg-muted-foreground/20";

  if (!animate) {
    return <div className={cn("h-1.5 rounded-full", bgColor, className)} />;
  }

  return (
    <motion.div
      variants={textVariants}
      className={cn("h-1.5 origin-left rounded-full", bgColor, className)}
    />
  );
}

function Button({
  variant = "secondary",
  className,
  animate = true,
}: {
  variant?: "primary" | "secondary";
  className?: string;
  animate?: boolean;
}) {
  const height = variant === "primary" ? "h-4" : "h-1.5";
  const bgColor =
    variant === "primary"
      ? "bg-linear-to-b from-(--btn-from) to-(--btn-to)"
      : "bg-muted-foreground/20";

  if (!animate) {
    return <div className={cn(height, "w-7 rounded-sm", bgColor, className)} />;
  }

  return (
    <motion.div
      variants={buttonVariants}
      className={cn(height, "w-7 rounded-sm", bgColor, className)}
    />
  );
}

// Standalone Card component for thumbnails - independent from registry Card
function Card({
  children,
  className,
  withGradient = true,
  animate = false,
}: {
  children: ReactNode;
  className?: string;
  withGradient?: boolean;
  animate?: boolean;
}) {
  const cardClass = cn(
    "relative flex w-full max-w-72 flex-col rounded-2xl border not-dark:bg-clip-padding text-card-foreground shadow-md/5 before:pointer-events-none before:absolute before:inset-0 before:rounded-[calc(var(--radius-2xl)-1px)] before:shadow-[0_-1px_--theme(--color-white/6%),0_1px_--theme(--color-black/6%)]",
    withGradient
      ? "bg-linear-to-b from-[color-mix(in_srgb,var(--card)_96%,var(--color-white))] to-[color-mix(in_srgb,var(--card)_99%,var(--color-black))] dark:to-[color-mix(in_srgb,var(--card)_98%,var(--color-white))]"
      : "bg-card/99 dark:bg-card",
    className,
  );

  if (!animate) {
    return <div className={cardClass}>{children}</div>;
  }

  return (
    <motion.div variants={cardVariants} className={cardClass}>
      {children}
    </motion.div>
  );
}

// Standalone CardPanel component for thumbnails - independent from registry CardPanel
function CardPanel({
  children,
  className,
  ...props
}: {
  children?: ReactNode;
  className?: string;
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex-1 p-6", className)} {...props}>
      {children}
    </div>
  );
}

// ============================================================================
// Helper Components
// ============================================================================

function CheckboxItem({
  checked = false,
  className,
}: {
  checked?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <motion.div
        variants={checked ? pulseVariants : undefined}
        className={cn(
          "size-4 shrink-0 rounded",
          checked
            ? "bg-linear-to-b from-(--btn-from) to-(--btn-to)"
            : "bg-muted-foreground/20",
        )}
      />
      <Text className="w-full" variant="secondary" />
    </div>
  );
}

function RadioItem({
  checked = false,
  className,
}: {
  checked?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <motion.div
        variants={checked ? pulseVariants : undefined}
        className={cn(
          "size-4 shrink-0 rounded-full",
          checked
            ? "bg-linear-to-b from-(--btn-from) to-(--btn-to)"
            : "bg-muted-foreground/20",
        )}
      />
      <Text className="w-full" variant="secondary" />
    </div>
  );
}

function FormField({
  labelWidth = "w-16",
  showError = false,
}: {
  labelWidth?: string;
  showError?: boolean;
}) {
  return (
    <motion.div variants={slideVariants} className="flex flex-col gap-2">
      <Text className={labelWidth} animate />
      <Card className="[--radius-2xl:10px]" withGradient={false} animate>
        <CardPanel className="py-3.5" />
      </Card>
      {showError && (
        <motion.div variants={pulseVariants}>
          <Text className="w-[80%]" variant="secondary" />
        </motion.div>
      )}
    </motion.div>
  );
}

function TableRow({ showCheckbox = true }: { showCheckbox?: boolean }) {
  return (
    <motion.div variants={slideVariants} className="flex items-center gap-2 p-3">
      {showCheckbox && <Text className="size-2.5 rounded-xs" />}
      <Text className="flex-1" />
      <Text className="flex-1" variant="secondary" />
      <Text className="flex-1" variant="secondary" />
      <Text className="flex-1" variant="secondary" />
      <Text className="flex-1" variant="secondary" />
    </motion.div>
  );
}

function CommandItem() {
  return (
    <motion.div variants={slideVariants} className="flex items-center justify-between gap-2">
      <Text className="w-[65%]" variant="secondary" />
      <Text className="w-4" variant="secondary" />
    </motion.div>
  );
}

// ============================================================================
// Thumbnail Implementations
// ============================================================================

// Accordion
export const accordionThumbnail = (
  <Card className="max-w-50" animate>
    <CardPanel className="divide-y divide-border p-0">
      <div className="p-3">
        <div className="flex items-center gap-2">
          <ChevronIcon direction="down" />
          <Text className="w-[60%]" />
        </div>
      </div>
      <div className="p-3">
        <div className="flex items-center gap-2">
          <ChevronIcon direction="up" />
          <div className="flex flex-1 flex-col gap-2">
            <Text className="w-[50%]" variant="main" />
            <Text className="w-[90%]" variant="secondary" />
          </div>
        </div>
      </div>
      <div className="p-3">
        <div className="flex items-center gap-2">
          <ChevronIcon direction="down" />
          <Text className="w-[60%]" />
        </div>
      </div>
    </CardPanel>
  </Card>
);

// Alert
export const alertThumbnail = (
  <Card animate>
    <CardPanel className="flex items-center gap-2 p-3">
      <Icon icon={AlertCircleIcon} />
      <Text className="w-[70%]" variant="secondary" animate />
    </CardPanel>
  </Card>
);

// Alert Dialog
export const alertDialogThumbnail = (
  <Card className="max-w-50" animate>
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

// Autocomplete
export const autocompleteThumbnail = (
  <div className="flex max-w-50 flex-1 flex-col gap-2">
    <Card className="[--radius-2xl:12px]" withGradient={false}>
      <CardPanel className="flex items-center gap-2 px-4 py-2">
        <Text className="w-[40%]" animate />
        <motion.div variants={pulseVariants}>
          <Icon icon={TextCursorIcon} animate={false} />
        </motion.div>
      </CardPanel>
    </Card>
    <Card className="[--radius-2xl:10px]" animate>
      <CardPanel className="flex flex-col gap-4 p-4">
        <Text variant="secondary" />
        <Text variant="secondary" />
        <Text variant="secondary" />
      </CardPanel>
    </Card>
  </div>
);

// Avatar
export const avatarThumbnail = (
  <Card className="size-12 [--radius-2xl:9999px]" animate>
    <CardPanel className="flex items-center justify-center p-0">
      <div className="flex size-full items-center justify-center rounded-full">
        <Icon icon={UserRoundIcon} />
      </div>
    </CardPanel>
  </Card>
);

// Badge
export const badgeThumbnail = (
  <Card className="max-w-24 [--radius-2xl:9999px]" animate>
    <CardPanel className="flex items-center gap-2 px-2.5 py-2">
      <motion.div variants={pulseVariants} className="size-2 rounded-full bg-muted-foreground/88" />
      <Text className="flex-1" animate />
    </CardPanel>
  </Card>
);

// Breadcrumb
export const breadcrumbThumbnail = (
  <Card animate>
    <CardPanel className="flex items-center gap-1 p-3">
      <Text className="flex-1" />
      <Icon icon={ChevronRightIcon} />
      <Text className="flex-1" variant="secondary" />
      <Icon icon={ChevronRightIcon} />
      <Text className="flex-1" variant="secondary" />
    </CardPanel>
  </Card>
);

// Button
export const buttonThumbnail = (
  <motion.div variants={buttonVariants}>
    <Card
      className="max-w-24 border-none bg-linear-to-b from-(--btn-from) to-(--btn-to) [--radius-2xl:14px]"
      withGradient={false}
    >
      <CardPanel className="px-6 py-4">
        <Text className="bg-primary-foreground/40" />
      </CardPanel>
    </Card>
  </motion.div>
);

// Card
export const cardThumbnail = (
  <Card className="max-w-36 [--radius-2xl:14px]" animate>
    <CardPanel className="flex flex-col gap-4 p-4">
      <div className="flex flex-col gap-2">
        <Text className="w-[60%]" variant="main" />
        <Text className="w-[90%]" variant="secondary" />
      </div>
      <div className="flex flex-col gap-2">
        <div className="h-4 rounded-sm bg-muted-foreground/8" />
        <div className="h-4 rounded-sm bg-muted-foreground/8" />
        <Button className="w-full rounded-sm" variant="primary" />
      </div>
    </CardPanel>
  </Card>
);

// Checkbox
export const checkboxThumbnail = (
  <div className="flex max-w-28 flex-1 flex-col gap-3">
    <CheckboxItem />
    <CheckboxItem checked />
  </div>
);

// Checkbox Group
export const checkboxGroupThumbnail = (
  <div className="flex max-w-28 flex-1 flex-col gap-3">
    <CheckboxItem checked />
    <CheckboxItem className="ps-4" />
    <CheckboxItem checked className="ps-4" />
    <CheckboxItem />
  </div>
);

// Collapsible
export const collapsibleThumbnail = (
  <Card animate>
    <CardPanel className="divide-y divide-border p-0">
      <div className="flex items-center justify-between px-4 py-3">
        <Text className="w-[60%]" />
        <ChevronIcon direction="down" />
      </div>
      <motion.div variants={slideVariants} className="flex flex-col gap-2 p-4">
        <Text className="w-[80%]" variant="secondary" />
        <Text className="w-[70%]" variant="secondary" />
      </motion.div>
    </CardPanel>
  </Card>
);

// Combobox
export const comboboxThumbnail = (
  <Card className="[--radius-2xl:14px]" withGradient={false} animate>
    <CardPanel className="flex items-center gap-2 px-3 py-[calc(--spacing(2.5)-1px)]">
      <motion.div variants={slideVariants} className="flex h-5 items-center gap-1 rounded-sm bg-muted-foreground/8 py-0.5 ps-2 pe-1">
        <Text className="w-6" />
        <Icon icon={XIcon} />
      </motion.div>
      <motion.div variants={slideVariants} className="flex h-5 items-center gap-1 rounded-sm bg-muted-foreground/8 py-0.5 ps-2 pe-1">
        <Text className="w-6" />
        <Icon icon={XIcon} />
      </motion.div>
    </CardPanel>
  </Card>
);

// Command
export const commandThumbnail = (
  <Card className="max-w-50" animate>
    <CardPanel className="divide-y divide-border p-0">
      <div className="flex items-center gap-2 px-4 py-3">
        <Icon icon={SearchIcon} />
        <Text className="w-[40%]" animate />
      </div>
      <div className="flex flex-col gap-4 p-4">
        <CommandItem />
        <CommandItem />
        <CommandItem />
      </div>
    </CardPanel>
  </Card>
);

// Dialog
export const dialogThumbnail = (
  <Card className="max-w-36 [--radius-2xl:14px]" animate>
    <CardPanel className="flex flex-col gap-4 p-4">
      <div className="flex flex-col gap-2">
        <Text className="w-[60%]" variant="main" />
      </div>
      <div className="flex flex-col gap-2">
        <div className="h-4 rounded-sm bg-muted-foreground/8" />
        <div className="h-4 rounded-sm bg-muted-foreground/8" />
      </div>
      <div className="flex items-center justify-end gap-2">
        <Button variant="secondary" />
        <Button variant="primary" />
      </div>
    </CardPanel>
  </Card>
);

// Empty
export const emptyThumbnail = (
  <Card className="border-input border-dashed bg-none shadow-none before:hidden" animate>
    <CardPanel className="flex flex-col items-center gap-2">
      <motion.div variants={pulseVariants} className="size-8 rounded-full bg-muted-foreground/20" />
      <Text className="w-[60%]" />
      <Text className="w-[80%]" variant="secondary" />
    </CardPanel>
  </Card>
);

// Field
export const fieldThumbnail = (
  <motion.div variants={cardVariants} className="flex max-w-50 flex-1 flex-col gap-3">
    <FormField showError />
  </motion.div>
);

// Fieldset
export const fieldsetThumbnail = (
  <motion.div variants={cardVariants} className="flex max-w-50 flex-1 flex-col gap-4">
    <FormField />
    <FormField />
  </motion.div>
);

// Form
export const formThumbnail = (
  <motion.div variants={cardVariants} className="flex max-w-50 flex-1 flex-col gap-4">
    <div className="flex flex-col gap-2">
      <Text className="w-16" animate />
      <Card className="[--radius-2xl:10px]" withGradient={false} animate>
        <CardPanel className="py-3.5" />
      </Card>
    </div>
    <motion.div variants={buttonVariants}>
      <Card
        className="border-none bg-linear-to-b from-(--btn-from) to-(--btn-to) [--radius-2xl:10px]"
        withGradient={false}
      >
        <CardPanel className="py-3.5" />
      </Card>
    </motion.div>
  </motion.div>
);

// Frame
export const frameThumbnail = (
  <motion.div variants={cardVariants} className="flex-1 rounded-[calc(var(--radius-2xl)+2px)] bg-muted/72 p-1">
    <div className="flex flex-col gap-2 p-4">
      <Text className="w-[70%]" />
    </div>
    <Card className="max-w-none">
      <CardPanel className="p-5">
        <div className="flex flex-col gap-2">
          <Text className="w-[70%]" />
          <Text className="w-[90%]" variant="secondary" />
        </div>
      </CardPanel>
    </Card>
  </motion.div>
);

// Group
export const groupThumbnail = (
  <Card className="max-w-48 flex-row divide-x [--radius-2xl:14px]" animate>
    <CardPanel className="px-6 py-4">
      <Text />
    </CardPanel>
    <CardPanel className="px-6 py-4">
      <Text />
    </CardPanel>
  </Card>
);

// Input
export const inputThumbnail = (
  <Card className="[--radius-2xl:14px]" withGradient={false} animate>
    <CardPanel className="px-6 py-4">
      <Text className="w-[60%]" animate />
    </CardPanel>
  </Card>
);

// Input Group
export const inputGroupThumbnail = (
  <Card className="[--radius-2xl:14px]" withGradient={false} animate>
    <CardPanel className="flex gap-2 p-0">
      <div className="flex flex-1 items-center gap-2 py-2.5 ps-4">
        <Icon icon={SearchIcon} />
        <Text className="w-[60%]" animate />
      </div>
      <div className="flex items-center py-2.5 pe-4">
        <div className="size-4 shrink-0 rounded bg-muted-foreground/20" />
      </div>
    </CardPanel>
  </Card>
);

// Kbd
export const kbdThumbnail = (
  <div className="flex items-center justify-center gap-2">
    <Card className="size-10 [--radius-2xl:10px]" animate>
      <CardPanel className="flex items-center justify-center p-0 text-muted-foreground/88 leading-none">
        ⌘
      </CardPanel>
    </Card>
    <Card className="size-10 [--radius-2xl:10px]" animate>
      <CardPanel className="flex items-center justify-center p-0 text-muted-foreground/88 leading-none">
        K
      </CardPanel>
    </Card>
  </div>
);

// Label
export const labelThumbnail = (
  <div className="flex max-w-50 flex-1 flex-col gap-3">
    <Text className="w-16 bg-primary" animate />
    <Card className="[--radius-2xl:10px]" animate>
      <CardPanel className="py-3.5" />
    </Card>
  </div>
);

// Menu
export const menuThumbnail = (
  <div className="flex max-w-50 flex-1 flex-col items-end gap-2">
    <Card className="w-fit [--radius-2xl:12px]" animate>
      <CardPanel className="flex items-center gap-2 p-2">
        <Icon icon={EllipsisIcon} />
      </CardPanel>
    </Card>
    <Card className="[--radius-2xl:10px]" animate>
      <CardPanel className="flex flex-col gap-4 p-4">
        <motion.div variants={slideVariants} className="me-6">
          <Text className="w-full" variant="secondary" />
        </motion.div>
        <motion.div variants={slideVariants} className="flex items-center gap-4">
          <div className="flex-1">
            <Text variant="secondary" />
          </div>
          <Icon className="-m-1" icon={ChevronRightIcon} animate={false} />
        </motion.div>
        <motion.div variants={slideVariants} className="me-6">
          <Text className="w-full" variant="secondary" />
        </motion.div>
      </CardPanel>
    </Card>
  </div>
);

// Meter
export const meterThumbnail = (
  <div className="flex max-w-50 flex-1 flex-col gap-2">
    <div className="flex items-center justify-between">
      <Text className="w-[50%]" />
      <Text className="w-8" />
    </div>
    <div className="h-2 w-full rounded-full bg-muted-foreground/20">
      <motion.div
        variants={progressVariants}
        className="h-2 w-[65%] origin-left rounded-s-full bg-linear-to-b from-(--btn-from) to-(--btn-to)"
      />
    </div>
  </div>
);

// Number Field
export const numberFieldThumbnail = (
  <Card className="[--radius-2xl:14px]" animate>
    <CardPanel className="flex items-center gap-2 px-4 py-2.5">
      <Icon className="shrink-0" icon={MinusIcon} />
      <div className="flex flex-1 justify-center">
        <Text className="w-12" />
      </div>
      <Icon className="shrink-0" icon={PlusIcon} />
    </CardPanel>
  </Card>
);

// Pagination
export const paginationThumbnail = (
  <div className="flex flex-1 items-center gap-4">
    <Card className="w-fit [--radius-2xl:12px]" animate>
      <CardPanel className="flex items-center gap-2 p-2">
        <Icon icon={ChevronLeftIcon} />
      </CardPanel>
    </Card>
    <div className="flex flex-1 gap-2">
      <Text className="flex-1" variant="secondary" />
      <Text className="flex-1" variant="secondary" />
      <Text className="flex-1" variant="secondary" />
    </div>
    <Card className="w-fit [--radius-2xl:12px]" animate>
      <CardPanel className="flex items-center gap-2 p-2">
        <Icon icon={ChevronRightIcon} />
      </CardPanel>
    </Card>
  </div>
);

// Popover
export const popoverThumbnail = (
  <div className="flex max-w-50 flex-1 flex-col items-center gap-2">
    <Card className="w-fit [--radius-2xl:12px]" animate>
      <CardPanel className="flex items-center gap-2 px-4 py-3">
        <Text className="w-12" variant="main" />
      </CardPanel>
    </Card>
    <Card className="[--radius-2xl:10px]" animate>
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

// Preview Card
export const previewCardThumbnail = (
  <Card className="max-w-50" animate>
    <CardPanel className="flex items-center gap-3 p-4">
      <motion.div variants={pulseVariants} className="size-9 shrink-0 rounded-full bg-muted-foreground/20" />
      <div className="flex flex-1 flex-col gap-2">
        <Text className="w-[70%]" variant="main" />
        <Text variant="secondary" />
        <Text className="w-[90%]" variant="secondary" />
      </div>
    </CardPanel>
  </Card>
);

// Progress
export const progressThumbnail = (
  <div className="flex max-w-50 flex-1 flex-col gap-2">
    <div className="h-2 w-full rounded-full bg-muted-foreground/20">
      <motion.div
        variants={progressVariants}
        className="h-2 w-[45%] origin-left rounded-s-full bg-linear-to-b from-(--btn-from) to-(--btn-to)"
      />
    </div>
  </div>
);

// Radio Group
export const radioGroupThumbnail = (
  <div className="flex max-w-28 flex-1 flex-col gap-3">
    <RadioItem />
    <RadioItem checked />
  </div>
);

// Scroll Area
export const scrollAreaThumbnail = (
  <Card className="max-w-36 [--radius-2xl:14px]" animate>
    <CardPanel className="relative p-0">
      <div className="flex flex-col gap-2 p-3">
        <Text className="w-[80%]" variant="secondary" />
        <Text className="w-[90%]" variant="secondary" />
        <Text className="w-[70%]" variant="secondary" />
        <Text className="w-[85%]" variant="secondary" />
        <Text className="w-[90%]" variant="secondary" />
        <Text className="w-[80%]" variant="secondary" />
      </div>
      <motion.div
        variants={{
          rest: { y: 0 },
          hover: { y: 8, transition: { duration: 0.3, ease: "easeOut" } },
        }}
        className="absolute top-2 right-1 h-8 w-1 rounded-full bg-muted-foreground/40"
      />
    </CardPanel>
  </Card>
);

// Select
export const selectThumbnail = (
  <Card className="[--radius-2xl:14px]" withGradient={false} animate>
    <CardPanel className="flex gap-2 p-0">
      <div className="flex flex-1 items-center justify-between gap-2 py-2.5 ps-4 pe-2.5">
        <Text className="w-[60%]" />
        <ChevronIcon direction="down" />
      </div>
    </CardPanel>
  </Card>
);

// Separator
export const separatorThumbnail = (
  <motion.div variants={cardVariants} className="max-w-50 flex-1 divide-y">
    <div className="flex flex-col gap-2 py-3">
      <Text className="w-[60%]" />
      <Text variant="secondary" />
    </div>
    <div className="flex items-center gap-2 divide-x py-3">
      <div className="-mx-2 flex-1 px-2 py-1">
        <Text variant="secondary" />
      </div>
      <div className="flex-1 px-2 py-1">
        <Text variant="secondary" />
      </div>
      <div className="-mx-2 flex-1 px-2 py-1">
        <Text variant="secondary" />
      </div>
      <div className="flex-1 px-2 py-1">
        <Text variant="secondary" />
      </div>
    </div>
  </motion.div>
);

// Sheet
export const sheetThumbnail = (
  <div className="flex h-full flex-1 gap-2">
    <div className="flex-1 rounded-xl border border-input border-dashed" />
    <Card className="h-full max-w-1/3 [--radius-2xl:14px]" animate>
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

// Skeleton
export const skeletonThumbnail = (
  <motion.div
    variants={pulseVariants}
    className="mask-[linear-gradient(100deg,black_0%,rgba(0,0,0,0.2)_20%,rgba(0,0,0,0.2)_80%,rgba(0,0,0,0.6)_100%)] flex max-w-50 flex-1 items-center gap-3"
  >
    <div className="size-8 rounded-full bg-muted-foreground/20" />
    <div className="flex flex-1 flex-col gap-2">
      <Text className="w-full" variant="secondary" />
      <Text className="w-full" variant="secondary" />
    </div>
  </motion.div>
);

// Slider
export const sliderThumbnail = (
  <div className="flex w-full max-w-50 items-center gap-1">
    <motion.div
      variants={progressVariants}
      className="h-1.5 w-[35%] origin-left rounded-full bg-linear-to-b from-(--btn-from) to-(--btn-to)"
    />
    <motion.div
      variants={{
        rest: { x: 0, scale: 1 },
        hover: { x: 8, scale: 1.1, transition: { duration: 0.3, ease: "easeOut" } },
      }}
      className="size-4 rounded-full bg-linear-to-b from-(--btn-from) to-(--btn-to)"
    />
    <Text className="flex-1" variant="secondary" />
  </div>
);

// Spinner
export const spinnerThumbnail = (
  <motion.div
    variants={spinnerVariants}
    className="size-8 rounded-full border-3 border-muted-foreground/20 border-t-primary"
  />
);

// Switch
export const switchThumbnail = (
  <div className="h-6 w-10 rounded-full bg-muted-foreground/20 p-0.5">
    <motion.div
      variants={toggleVariants}
      className="size-5 rounded-full bg-linear-to-b from-card to-card/90 shadow-xs/5 dark:from-background/90 dark:to-background"
    />
  </div>
);

// Table
export const tableThumbnail = (
  <Card animate>
    <CardPanel className="p-0">
      <div className="divide-y divide-border">
        <TableRow />
        <TableRow />
        <TableRow />
      </div>
    </CardPanel>
  </Card>
);

// Tabs
export const tabsThumbnail = (
  <motion.div variants={cardVariants} className="flex max-w-50 flex-col gap-4">
    <div className="flex rounded-lg bg-muted-foreground/12 p-0.5">
      <motion.div
        variants={{
          rest: { scale: 1 },
          hover: { scale: 1.02, transition: { duration: 0.2 } },
        }}
        className="rounded-[calc(var(--radius-lg)-1px)] bg-linear-to-b from-card to-card/90 p-3 shadow-xs/5 dark:from-background/90 dark:to-background"
      >
        <Text className="w-6 bg-primary" />
      </motion.div>
      <div className="rounded-[calc(var(--radius-lg)-1px)] p-3">
        <Text className="w-6" variant="secondary" />
      </div>
      <div className="rounded-[calc(var(--radius-lg)-1px)] p-3">
        <Text className="w-6" variant="secondary" />
      </div>
    </div>
    <div className="flex flex-col gap-2">
      <Text className="w-[70%]" />
      <Text variant="secondary" />
    </div>
  </motion.div>
);

// Textarea
export const textareaThumbnail = (
  <Card className="[--radius-2xl:14px]" withGradient={false} animate>
    <CardPanel className="flex flex-col gap-2 px-6 py-4">
      <Text className="w-[60%]" animate />
      <Text className="opacity-0" />
      <Text className="opacity-0" />
    </CardPanel>
  </Card>
);

// Toast
export const toastThumbnail = (
  <div className="relative flex flex-1 justify-center">
    <Card className="-top-6 absolute scale-80">
      <CardPanel className="flex items-center gap-2 p-3" />
    </Card>
    <Card className="-top-3 absolute scale-90">
      <CardPanel className="flex items-center gap-2 p-3" />
    </Card>
    <Card animate>
      <CardPanel className="flex items-start gap-2 p-3">
        <Icon icon={AlertCircleIcon} />
        <div className="flex flex-1 flex-col gap-2">
          <Text className="w-[40%]" />
          <Text className="w-[70%]" variant="secondary" />
        </div>
      </CardPanel>
    </Card>
  </div>
);

// Toggle
export const toggleThumbnail = (
  <div className="flex flex-1 flex-col items-center justify-center gap-2">
    <Card className="max-w-12 [--radius-2xl:14px]" animate>
      <CardPanel className="rounded-[inherit] p-4">
        <Text />
      </CardPanel>
    </Card>
    <Card className="max-w-12 shadow-none [--radius-2xl:14px] before:hidden" animate>
      <CardPanel className="rounded-[inherit] bg-muted-foreground/8 p-4">
        <Text className="bg-primary" />
      </CardPanel>
    </Card>
  </div>
);

// Toggle Group
export const toggleGroupThumbnail = (
  <Card className="w-auto flex-row divide-x [--radius-2xl:14px]" animate>
    <CardPanel className="bg-clip-padding p-4">
      <Text className="w-4" />
    </CardPanel>
    <motion.div variants={pulseVariants}>
      <CardPanel className="bg-muted-foreground/8 bg-clip-padding p-4">
        <Text className="w-4 bg-foreground" />
      </CardPanel>
    </motion.div>
    <CardPanel className="bg-clip-padding p-4">
      <Text className="w-4" />
    </CardPanel>
  </Card>
);

// Toolbar
export const toolbarThumbnail = (
  <motion.div variants={cardVariants} className="flex items-center gap-1 rounded-xl border p-1">
    <Card className="w-fit [--radius-2xl:12px]">
      <CardPanel className="p-3.5">
        <Text className="w-4" />
      </CardPanel>
    </Card>
    <Card className="w-fit [--radius-2xl:12px]">
      <CardPanel className="p-3.5">
        <Text className="w-4" />
      </CardPanel>
    </Card>
    <Card className="w-fit [--radius-2xl:12px]">
      <CardPanel className="p-3.5">
        <Text className="w-4" />
      </CardPanel>
    </Card>
  </motion.div>
);

// Tooltip
export const tooltipThumbnail = (
  <div className="flex max-w-32 flex-1 flex-col items-center gap-2">
    <Card className="[--radius-2xl:10px]" animate>
      <CardPanel className="p-4">
        <Text />
      </CardPanel>
    </Card>
    <Icon icon={InfoIcon} />
  </div>
);

// ============================================================================
// Category Thumbnails Map
// ============================================================================

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
