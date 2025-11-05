import {
  CopyIcon,
  DownloadIcon,
  EllipsisIcon,
  FilesIcon,
  FilmIcon,
  FilterIcon,
  SearchIcon,
  ZoomInIcon,
  ZoomOutIcon,
} from "lucide-react"

import { Button } from "@/registry/default/ui/button"
import { Group, GroupSeparator, GroupText } from "@/registry/default/ui/group"
import { Input } from "@/registry/default/ui/input"
import { Label } from "@/registry/default/ui/label"
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from "@/registry/default/ui/select"

const items = [
  { label: "Select framework", value: null },
  { label: "Next.js", value: "next" },
  { label: "Vite", value: "vite" },
  { label: "Astro", value: "astro" },
]

export default function GroupDemo() {
  return (
    <div className="flex flex-col gap-4">
      <Group>
        <Button variant="outline">
          <FilesIcon />
          Files
        </Button>
        <GroupSeparator />
        <Button variant="outline">
          <FilmIcon />
          Media
        </Button>
        <GroupSeparator />
        <Button variant="outline" size="icon" aria-label="Menu">
          <EllipsisIcon />
        </Button>
      </Group>

      <Group>
        <Button>
          <FilesIcon />
          Files
        </Button>
        <GroupSeparator className="bg-primary/72" />
        <Button>
          <FilmIcon />
          Media
        </Button>
        <GroupSeparator className="bg-primary/72" />
        <Button size="icon" aria-label="Menu">
          <EllipsisIcon />
        </Button>
      </Group>

      <Group>
        <Input type="text" defaultValue="https://coss.com" />
        <GroupSeparator />
        <Button variant="outline" size="icon" aria-label="Copy">
          <CopyIcon />
        </Button>
      </Group>

      <Group>
        <Button variant="outline" size="icon" aria-label="Filter">
          <FilterIcon />
        </Button>
        <GroupSeparator />
        <Input
          type="text"
          defaultValue="https://coss.com"
          aria-label="Search"
        />
        <GroupSeparator />
        <Button variant="outline">
          <SearchIcon />
          Button
        </Button>
        <GroupSeparator />
        <Input type="email" defaultValue="Enter email" aria-label="Email" />
        <GroupSeparator />
        <Select items={items} defaultValue="next">
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectPopup>
            {items.map(({ label, value }) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectPopup>
        </Select>
        <GroupSeparator />
        <Button variant="outline" size="icon" aria-label="Download">
          <DownloadIcon />
        </Button>
      </Group>

      <Group>
        <GroupText render={<Label htmlFor="domain" aria-label="Domain" />}>
          https://
        </GroupText>
        <GroupSeparator />
        <Input
          id="domain"
          type="text"
          defaultValue="coss.com"
          aria-label="Domain"
        />
      </Group>

      <Group orientation="vertical">
        <Button variant="outline" size="icon" aria-label="Zoom in">
          <ZoomInIcon />
        </Button>
        <GroupSeparator orientation="horizontal" />
        <Button variant="outline" size="icon" aria-label="Zoom Out">
          <ZoomOutIcon />
        </Button>
      </Group>
    </div>
  )
}
