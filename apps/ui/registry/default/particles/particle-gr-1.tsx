"use client";

import { SearchIcon } from "lucide-react";

import { Button } from "@/registry/default/ui/button";
import { Group, GroupSeparator } from "@/registry/default/ui/group";
import { Input } from "@/registry/default/ui/input";
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from "@/registry/default/ui/select";

const protocols = [
  { label: "http", value: "http" },
  { label: "https", value: "https" },
  { label: "http + https", value: "both" },
];

const subdomains = [
  { label: "Subdomains", value: null },
  { label: "www", value: "www" },
  { label: "api", value: "api" },
  { label: "cdn", value: "cdn" },
];

export default function ParticleGr1() {
  return (
    <Group aria-label="URL search">
      <Select items={protocols} defaultValue="both">
        <SelectTrigger className="w-fit min-w-none">
          <SelectValue />
        </SelectTrigger>
        <SelectPopup>
          {protocols.map(({ label, value }) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectPopup>
      </Select>
      <GroupSeparator />
      <Input
        type="text"
        defaultValue="coss.com"
        aria-label="URL"
        className="flex-1"
      />
      <GroupSeparator />
      <Select items={subdomains} defaultValue={null}>
        <SelectTrigger className="w-fit min-w-none">
          <SelectValue />
        </SelectTrigger>
        <SelectPopup>
          {subdomains.map(({ label, value }) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectPopup>
      </Select>
      <GroupSeparator />
      <Button variant="outline" size="icon" aria-label="Search">
        <SearchIcon />
      </Button>
    </Group>
  );
}
