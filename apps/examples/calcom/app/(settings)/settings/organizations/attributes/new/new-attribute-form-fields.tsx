"use client";

import { Button } from "@coss/ui/components/button";
import {
  Combobox,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxPopup,
  ComboboxTrigger,
  ComboboxValue,
} from "@coss/ui/components/combobox";
import { Field, FieldDescription, FieldLabel } from "@coss/ui/components/field";
import { Fieldset, FieldsetLegend } from "@coss/ui/components/fieldset";
import { Group } from "@coss/ui/components/group";
import { Input } from "@coss/ui/components/input";
import { Label } from "@coss/ui/components/label";
import {
  Popover,
  PopoverPopup,
  PopoverTrigger,
} from "@coss/ui/components/popover";
import {
  Select,
  SelectButton,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from "@coss/ui/components/select";
import { Switch } from "@coss/ui/components/switch";
import { InfoIcon, PlusIcon, SearchIcon, XIcon } from "lucide-react";
import { useMemo, useRef, useState } from "react";

const attributeTypeItems = [
  { label: "Text", value: "text" },
  { label: "Number", value: "number" },
  { label: "Single Select", value: "single_select" },
  { label: "Multi Select", value: "multi_select" },
] as const;

export function NewAttributeFormFields() {
  const [attributeType, setAttributeType] = useState("text");

  const nextOptionIdRef = useRef(1);
  const [options, setOptions] = useState([{ id: 0 }]);

  const showWeightsSwitch =
    attributeType === "single_select" || attributeType === "multi_select";

  function addOption() {
    setOptions((prev) => [...prev, { id: nextOptionIdRef.current++ }]);
  }

  function removeOption(id: number) {
    setOptions((prev) => prev.filter((o) => o.id !== id));
  }

  const nextGroupOptionIdRef = useRef(1);
  const [groupOptions, setGroupOptions] = useState<
    Array<{ id: number; selectedOptionId: number | null }>
  >([{ id: 0, selectedOptionId: null }]);

  const optionPickItems = useMemo(
    () =>
      options.map((o, i) => ({
        label: `Option ${i + 1}`,
        value: o.id,
      })),
    [options],
  );

  function addGroupOption() {
    setGroupOptions((prev) => [
      ...prev,
      { id: nextGroupOptionIdRef.current++, selectedOptionId: null },
    ]);
  }

  function removeGroupOption(id: number) {
    setGroupOptions((prev) => prev.filter((r) => r.id !== id));
  }

  return (
    <div className="flex flex-col gap-6">
      <Field>
        <div className="flex items-start gap-2">
          <Switch name="lockForAssignment" />
          <div className="flex flex-col gap-1">
            <FieldLabel>Lock for assignment</FieldLabel>
            <FieldDescription>
              Locking would only allow assignments from Directory Sync
            </FieldDescription>
          </div>
        </div>
      </Field>

      {showWeightsSwitch ? (
        <Field>
          <div className="flex items-start gap-2">
            <Switch name="weightsEnabled" />
            <div className="flex flex-col gap-1">
              <FieldLabel>Weights enabled</FieldLabel>
              <FieldDescription>
                By enabling weights, it would be possible to assign higher
                priority to certain attributes per user. The higher the weight,
                the higher the priority.
              </FieldDescription>
            </div>
          </div>
        </Field>
      ) : null}

      <Field>
        <FieldLabel>Name</FieldLabel>
        <Input name="name" type="text" />
      </Field>

      <Field>
        <FieldLabel>Type</FieldLabel>
        <Select
          aria-label="Attribute type"
          items={[...attributeTypeItems]}
          onValueChange={(value) => value && setAttributeType(value)}
          value={attributeType}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectPopup>
            {attributeTypeItems.map(({ label, value }) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectPopup>
        </Select>
      </Field>

      {showWeightsSwitch ? (
        <div className="rounded-xl bg-muted p-4">
          <div className="flex flex-col gap-4">
            <Fieldset className="max-w-none gap-2">
              <Label render={<FieldsetLegend />}>Options</Label>
              {options.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {options.map((option, index) => (
                    <Group
                      aria-label={`Option ${index + 1}`}
                      className="w-full gap-2"
                      key={option.id}
                    >
                      <Input
                        className="min-w-0 flex-1"
                        name={`options[${index}]`}
                        placeholder="Enter option value"
                        type="text"
                      />
                      <div>
                        <Button
                          aria-label="Remove option"
                          onClick={() => removeOption(option.id)}
                          size="icon"
                          type="button"
                          variant="outline"
                        >
                          <XIcon aria-hidden="true" />
                        </Button>
                      </div>
                    </Group>
                  ))}
                </div>
              ) : null}
              <div>
                <Button onClick={addOption} type="button" variant="outline">
                  <PlusIcon aria-hidden="true" />
                  New option
                </Button>
              </div>
            </Fieldset>

            <Fieldset className="max-w-none gap-2">
              <div className="flex items-center gap-1.5">
                <Label render={<FieldsetLegend />}>Group options</Label>
                <Popover>
                  <PopoverTrigger
                    aria-label="About group options"
                    delay={0}
                    openOnHover
                    closeDelay={100}
                  >
                    <InfoIcon className="size-3.5 text-muted-foreground" />
                  </PopoverTrigger>
                  <PopoverPopup
                    side="top"
                    tooltipStyle
                    className="max-w-64 text-center"
                  >
                    <p>
                      When a group option is assigned to a user, they behave as
                      if all options within that group are assigned to them.
                    </p>
                  </PopoverPopup>
                </Popover>
              </div>
              {groupOptions.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {groupOptions.map((row, index) => (
                    <Group
                      aria-label={`Group option ${index + 1}`}
                      className="w-full gap-2"
                      key={row.id}
                    >
                      <Input
                        className="flex-1"
                        name={`groupOptions[${index}].name`}
                        type="text"
                      />
                      <div className="flex-1">
                        <Combobox
                          disabled={optionPickItems.length === 0}
                          items={optionPickItems}
                          onValueChange={(item) => {
                            setGroupOptions((prev) =>
                              prev.map((r) =>
                                r.id === row.id
                                  ? {
                                      ...r,
                                      selectedOptionId: item?.value ?? null,
                                    }
                                  : r,
                              ),
                            );
                          }}
                          value={
                            optionPickItems.find(
                              (i) => i.value === row.selectedOptionId,
                            ) ?? null
                          }
                        >
                          <ComboboxTrigger
                            render={<SelectButton className="w-full min-w-0" />}
                          >
                            <ComboboxValue placeholder="Choose an option" />
                          </ComboboxTrigger>
                          <ComboboxPopup aria-label="Choose an option">
                            <div className="border-b p-2">
                              <ComboboxInput
                                className="rounded-md before:rounded-[calc(var(--radius-md)-1px)]"
                                placeholder="Search options…"
                                showTrigger={false}
                                startAddon={<SearchIcon />}
                              />
                            </div>
                            <ComboboxEmpty>No options available.</ComboboxEmpty>
                            <ComboboxList>
                              {(item: (typeof optionPickItems)[number]) => (
                                <ComboboxItem key={item.value} value={item}>
                                  {item.label}
                                </ComboboxItem>
                              )}
                            </ComboboxList>
                          </ComboboxPopup>
                        </Combobox>
                      </div>
                      <div>
                        <Button
                          aria-label="Remove group option"
                          onClick={() => removeGroupOption(row.id)}
                          size="icon"
                          type="button"
                          variant="outline"
                        >
                          <XIcon aria-hidden="true" />
                        </Button>
                      </div>
                    </Group>
                  ))}
                </div>
              ) : null}
              <div>
                <Button
                  onClick={addGroupOption}
                  type="button"
                  variant="outline"
                >
                  <PlusIcon aria-hidden="true" />
                  New group option
                </Button>
              </div>
            </Fieldset>
          </div>
        </div>
      ) : null}
    </div>
  );
}
