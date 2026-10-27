"use client";

import { Button } from "@coss/ui/components/button";
import { Checkbox } from "@coss/ui/components/checkbox";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@coss/ui/components/input-group";
import { Label } from "@coss/ui/components/label";
import { SearchIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { filterCategories, groupEventTypes } from "@/lib/event-categories";

/**
 * Event type checkboxes grouped by category, with a search box, select/deselect all and a checkbox
 * per category. Submits each selected type as a `name` field (hidden inputs, so types hidden by the
 * search are still sent).
 */
export function EventTypePicker(props: {
  name: string;
  eventTypes: readonly string[];
  defaultSelected?: readonly string[];
  /** Display names of categories by prefix (`{ sms: "SMS" }`); others show the prefix itself. */
  categoryLabels?: Readonly<Record<string, string>>;
  legend: string;
  description?: string;
}) {
  const { eventTypes, categoryLabels } = props;
  const [selected, setSelected] = useState(() => new Set(props.defaultSelected ?? []));
  const [query, setQuery] = useState("");
  const categories = useMemo(
    () => groupEventTypes(eventTypes, categoryLabels),
    [eventTypes, categoryLabels],
  );
  const visible = filterCategories(categories, query);
  const visibleTypes = visible.flatMap((category) => category.types);

  const setMany = (types: readonly string[], checked: boolean) =>
    setSelected((previous) => {
      const next = new Set(previous);
      for (const type of types) {
        if (checked) next.add(type);
        else next.delete(type);
      }
      return next;
    });

  // While searching, the bulk buttons act on the matching types only.
  const allVisibleSelected = visibleTypes.every((type) => selected.has(type));
  const noneVisibleSelected = visibleTypes.every((type) => !selected.has(type));

  return (
    <fieldset className="flex min-w-0 flex-col gap-2">
      <legend className="mb-2 font-medium text-sm">{props.legend}</legend>
      {props.description ? (
        <p className="text-muted-foreground text-xs">{props.description}</p>
      ) : null}
      {eventTypes
        .filter((type) => selected.has(type))
        .map((type) => (
          <input key={type} name={props.name} type="hidden" value={type} />
        ))}
      <InputGroup>
        <InputGroupAddon>
          <SearchIcon />
        </InputGroupAddon>
        <InputGroupInput
          aria-label="Search events"
          onChange={(event) => setQuery(event.target.value)}
          // Enter would submit the surrounding form.
          onKeyDown={(event) => {
            if (event.key === "Enter") event.preventDefault();
          }}
          placeholder="Search events"
          type="search"
          value={query}
        />
      </InputGroup>
      <div className="flex items-center justify-between gap-2">
        <p aria-live="polite" className="text-muted-foreground text-xs">
          {selected.size} of {eventTypes.length} selected
        </p>
        <div className="flex gap-1">
          <Button
            disabled={visibleTypes.length === 0 || allVisibleSelected}
            onClick={() => setMany(visibleTypes, true)}
            size="xs"
            variant="ghost"
          >
            Select all
          </Button>
          <Button
            disabled={visibleTypes.length === 0 || noneVisibleSelected}
            onClick={() => setMany(visibleTypes, false)}
            size="xs"
            variant="ghost"
          >
            Deselect all
          </Button>
        </div>
      </div>
      <div className="flex max-h-72 flex-col gap-4 overflow-y-auto rounded-lg border p-3">
        {visible.length === 0 ? (
          <p className="text-muted-foreground text-sm">No events match “{query.trim()}”.</p>
        ) : (
          visible.map((category) => {
            const count = category.types.filter((type) => selected.has(type)).length;
            return (
              <div className="flex flex-col gap-2" key={category.key}>
                <Label className="font-medium text-sm">
                  <Checkbox
                    checked={count === category.types.length}
                    indeterminate={count > 0 && count < category.types.length}
                    onCheckedChange={(checked) => setMany(category.types, checked)}
                  />
                  {category.label}
                  <span className="font-normal text-muted-foreground text-xs">
                    {count}/{category.types.length}
                  </span>
                </Label>
                <div className="flex flex-col gap-2 ps-6">
                  {category.types.map((type) => (
                    <Label className="font-mono text-xs" key={type}>
                      <Checkbox
                        checked={selected.has(type)}
                        onCheckedChange={(checked) => setMany([type], checked)}
                      />
                      {type}
                    </Label>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>
    </fieldset>
  );
}
