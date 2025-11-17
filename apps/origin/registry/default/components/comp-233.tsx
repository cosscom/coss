"use client";

import {
  BlocksIcon,
  BrainIcon,
  ChevronDownIcon,
  CpuIcon,
  DatabaseIcon,
  GlobeIcon,
  LayoutIcon,
  LineChartIcon,
  NetworkIcon,
  SearchIcon,
  ServerIcon,
} from "lucide-react";
import { useId, useState } from "react";

import { Button } from "@/registry/default/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/registry/default/ui/command";
import { Label } from "@/registry/default/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/registry/default/ui/popover";

const items = [
  {
    value: "analytics platform",
    label: "Analytics Platform",
    icon: LineChartIcon,
    number: 2451,
  },
  {
    value: "ai services",
    label: "AI Services",
    icon: BrainIcon,
    number: 1832,
  },
  {
    value: "database systems",
    label: "Database Systems",
    icon: DatabaseIcon,
    number: 1654,
  },
  {
    value: "compute resources",
    label: "Compute Resources",
    icon: CpuIcon,
    number: 943,
  },
  {
    value: "network services",
    label: "Network Services",
    icon: NetworkIcon,
    number: 832,
  },
  {
    value: "web services",
    label: "Web Services",
    icon: GlobeIcon,
    number: 654,
  },
  {
    value: "monitoring tools",
    label: "Monitoring Tools",
    icon: SearchIcon,
    number: 432,
  },
  {
    value: "server management",
    label: "Server Management",
    icon: ServerIcon,
    number: 321,
  },
  {
    value: "infrastructure",
    label: "Infrastructure",
    icon: BlocksIcon,
    number: 234,
  },
  {
    value: "frontend services",
    label: "Frontend Services",
    icon: LayoutIcon,
    number: 123,
  },
];

export default function Component() {
  const id = useId();
  const [open, setOpen] = useState<boolean>(false);
  const [value, setValue] = useState<string>("");

  return (
    <div className="*:not-first:mt-2">
      <Label htmlFor={id}>Options with icon and number</Label>
      <Popover onOpenChange={setOpen} open={open}>
        <PopoverTrigger asChild>
          <Button
            aria-expanded={open}
            className="w-full justify-between border-input bg-background px-3 font-normal outline-none outline-offset-0 hover:bg-background focus-visible:outline-[3px]"
            id={id}
            role="combobox"
            variant="outline"
          >
            {value ? (
              <span className="flex min-w-0 items-center gap-2">
                {(() => {
                  const selectedItem = items.find(
                    (item) => item.value === value,
                  );
                  if (selectedItem) {
                    const Icon = selectedItem.icon;
                    return <Icon className="size-4 text-muted-foreground" />;
                  }
                  return null;
                })()}
                <span className="truncate">
                  {items.find((item) => item.value === value)?.label}
                </span>
              </span>
            ) : (
              <span className="text-muted-foreground">
                Select service category
              </span>
            )}
            <ChevronDownIcon
              aria-hidden="true"
              className="shrink-0 text-muted-foreground/80"
              size={16}
            />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-full min-w-[var(--radix-popper-anchor-width)] border-input p-0"
        >
          <Command>
            <CommandInput placeholder="Search services..." />
            <CommandList>
              <CommandEmpty>No service found.</CommandEmpty>
              <CommandGroup>
                {items.map((item) => (
                  <CommandItem
                    className="flex items-center justify-between"
                    key={item.value}
                    onSelect={(currentValue) => {
                      setValue(currentValue === value ? "" : currentValue);
                      setOpen(false);
                    }}
                    value={item.value}
                  >
                    <div className="flex items-center gap-2">
                      <item.icon className="size-4 text-muted-foreground" />
                      {item.label}
                    </div>
                    <span className="text-muted-foreground text-xs">
                      {item.number.toLocaleString()}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
