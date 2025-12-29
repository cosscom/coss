"use client";

import { useAutocompleteFilter } from "@coss/ui/components/autocomplete";
import {
  Command,
  CommandCollection,
  CommandCreateHandle,
  CommandDialog,
  CommandDialogPopup,
  CommandEmpty,
  CommandFooter,
  CommandGroup,
  CommandGroupLabel,
  CommandInput,
  CommandItem,
  CommandList,
  CommandPanel,
  CommandSeparator,
  CommandShortcut,
} from "@coss/ui/components/command";
import { Kbd, KbdGroup } from "@coss/ui/components/kbd";
import { ArrowDownIcon, ArrowUpIcon, CornerDownLeftIcon } from "lucide-react";
import * as React from "react";

interface Item {
  value: string;
  label: string;
  shortcut?: string;
  keywords?: string[];
}

interface Group {
  value: string;
  items: Item[];
}

const commandGroups: Group[] = [
  {
    items: [
      {
        keywords: ["wf"],
        label: "Workflows",
        shortcut: "w f",
        value: "workflows",
      },
    ],
    value: "Workflows",
  },
  {
    items: [
      {
        keywords: ["et"],
        label: "Event Types",
        shortcut: "e t",
        value: "event-types",
      },
      { label: "15 Min Meeting", value: "15-min-meeting" },
      { label: "30 Min Meeting", value: "30-min-meeting" },
      { label: "Secret Meeting", value: "secret-meeting" },
    ],
    value: "Event Types",
  },
  {
    items: [
      {
        keywords: ["as"],
        label: "App Store",
        shortcut: "a s",
        value: "app-store",
      },
    ],
    value: "Apps",
  },
  {
    items: [
      {
        keywords: ["ub"],
        label: "Upcoming",
        shortcut: "u b",
        value: "upcoming",
      },
      {
        keywords: ["rb"],
        label: "Recurring",
        shortcut: "r b",
        value: "recurring",
      },
      { keywords: ["pb"], label: "Past", shortcut: "p b", value: "past" },
      {
        keywords: ["cb"],
        label: "Canceled",
        shortcut: "c b",
        value: "canceled",
      },
    ],
    value: "Bookings",
  },
  {
    items: [
      {
        keywords: ["sa"],
        label: "Availability",
        shortcut: "s a",
        value: "availability",
      },
    ],
    value: "Availability",
  },
  {
    items: [
      {
        keywords: ["ps"],
        label: "Profile",
        shortcut: "p s",
        value: "profile",
      },
      {
        keywords: ["ca"],
        label: "Change Avatar",
        shortcut: "c a",
        value: "change-avatar",
      },
      {
        keywords: ["ct"],
        label: "Timezone",
        shortcut: "c t",
        value: "timezone",
      },
      {
        keywords: ["bc"],
        label: "Brand Color",
        shortcut: "b c",
        value: "brand-color",
      },
      { keywords: ["ts"], label: "Teams", shortcut: "t s", value: "teams" },
    ],
    value: "Profile",
  },
  {
    items: [
      {
        keywords: ["cp"],
        label: "Change Password",
        shortcut: "c p",
        value: "change-password",
      },
      {
        keywords: ["tfa"],
        label: "Two factor authentication",
        shortcut: "t f a",
        value: "two-factor-auth",
      },
      {
        keywords: ["ui"],
        label: "User Impersonation",
        shortcut: "u i",
        value: "user-impersonation",
      },
    ],
    value: "Security",
  },
  {
    items: [
      {
        keywords: ["ul"],
        label: "Choose a license",
        shortcut: "u l",
        value: "choose-license",
      },
    ],
    value: "Admin",
  },
  {
    items: [
      {
        keywords: ["wh"],
        label: "Webhooks",
        shortcut: "w h",
        value: "webhooks",
      },
      {
        keywords: ["api"],
        label: "API keys",
        shortcut: "a p i",
        value: "api-keys",
      },
    ],
    value: "Developer",
  },
  {
    items: [
      {
        keywords: ["mb"],
        label: "Manage billing",
        shortcut: "m b",
        value: "manage-billing",
      },
    ],
    value: "Billing",
  },
  {
    items: [
      { label: "Alby", value: "alby" },
      { label: "Amie", value: "amie" },
      { label: "Apple Calendar", value: "apple-calendar" },
      { label: "Attio", value: "attio" },
      { label: "Autocheckin", value: "autocheckin" },
      { label: "BAA for HIPAA", value: "baa-hipaa" },
    ],
    value: "Installable Apps",
  },
];

export const commandHandle: ReturnType<typeof CommandCreateHandle> =
  CommandCreateHandle();

export function AppCommand() {
  const [open, setOpen] = React.useState(false);

  function handleItemClick(_item: Item) {
    setOpen(false);
  }

  const { contains } = useAutocompleteFilter({ sensitivity: "base" });

  const filterItem = React.useCallback(
    (itemValue: unknown, query: string) => {
      const item = itemValue as Item;

      // Search in label
      if (contains(item.label, query)) {
        return true;
      }

      // Search in value
      if (contains(item.value, query)) {
        return true;
      }

      // Search in keywords
      if (item.keywords?.some((keyword) => contains(keyword, query))) {
        return true;
      }

      return false;
    },
    [contains],
  );

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        if (
          (e.target instanceof HTMLElement && e.target.isContentEditable) ||
          e.target instanceof HTMLInputElement ||
          e.target instanceof HTMLTextAreaElement ||
          e.target instanceof HTMLSelectElement
        ) {
          return;
        }

        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  return (
    <CommandDialog handle={commandHandle} onOpenChange={setOpen} open={open}>
      <CommandDialogPopup>
        <Command filter={filterItem} items={commandGroups}>
          <CommandInput placeholder="Type a command or search..." />
          <CommandPanel>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandList>
              {(group: Group) => (
                <React.Fragment key={group.value}>
                  <CommandGroup items={group.items}>
                    <CommandGroupLabel>{group.value}</CommandGroupLabel>
                    <CommandCollection>
                      {(item: Item) => (
                        <CommandItem
                          key={item.value}
                          onClick={() => handleItemClick(item)}
                          value={item.value}
                        >
                          <span className="flex-1">{item.label}</span>
                          {item.shortcut && (
                            <CommandShortcut>{item.shortcut}</CommandShortcut>
                          )}
                        </CommandItem>
                      )}
                    </CommandCollection>
                  </CommandGroup>
                  <CommandSeparator />
                </React.Fragment>
              )}
            </CommandList>
          </CommandPanel>
          <CommandFooter>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <KbdGroup>
                  <Kbd>
                    <ArrowUpIcon />
                  </Kbd>
                  <Kbd>
                    <ArrowDownIcon />
                  </Kbd>
                </KbdGroup>
                <span>Navigate</span>
              </div>
              <div className="flex items-center gap-2">
                <Kbd>
                  <CornerDownLeftIcon />
                </Kbd>
                <span>Open</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Kbd>Esc</Kbd>
              <span>Close</span>
            </div>
          </CommandFooter>
        </Command>
      </CommandDialogPopup>
    </CommandDialog>
  );
}
