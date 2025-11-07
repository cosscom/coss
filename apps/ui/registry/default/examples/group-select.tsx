"use client"

import { ArrowRightIcon } from "lucide-react"

import { Button } from "@/registry/default/ui/button"
import { Group, GroupSeparator } from "@/registry/default/ui/group"
import {
  NumberField,
  NumberFieldGroup,
  NumberFieldInput,
} from "@/registry/default/ui/number-field"
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from "@/registry/default/ui/select"

interface Currency {
  value: string
  label: string
}

const currencies: Currency[] = [
  {
    value: "$",
    label: "US Dollar",
  },
  {
    value: "€",
    label: "Euro",
  },
  {
    value: "£",
    label: "British Pound",
  },
]

export default function GroupSelect() {
  return (
    <Group aria-label="Payment amount">
      <Group aria-label="Amount input">
        <Select
          defaultValue={currencies[0]}
          itemToStringValue={(currency) => currency.value}
        >
          <SelectTrigger className="min-w-none w-fit">
            <SelectValue>{(currency: Currency) => currency.value}</SelectValue>
          </SelectTrigger>
          <SelectPopup className="min-w-48">
            {currencies.map((curr) => (
              <SelectItem key={curr.value} value={curr}>
                {curr.value}{" "}
                <span className="text-muted-foreground">{curr.label}</span>
              </SelectItem>
            ))}
          </SelectPopup>
        </Select>
        <GroupSeparator />
        <NumberField
          defaultValue={10}
          aria-label="Enter the amount"
          render={<NumberFieldGroup />}
        >
          <NumberFieldInput className="text-left" />
        </NumberField>
      </Group>
      <Group aria-label="Submit">
        <Button aria-label="Send" size="icon" variant="outline">
          <ArrowRightIcon />
        </Button>
      </Group>
    </Group>
  )
}
