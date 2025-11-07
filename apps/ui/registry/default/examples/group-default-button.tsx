import {
  ArchiveIcon,
  EditIcon,
  EllipsisIcon,
  FilesIcon,
  FilmIcon,
  ShareIcon,
  TrashIcon,
} from "lucide-react"

import { Button } from "@/registry/default/ui/button"
import { Group, GroupSeparator } from "@/registry/default/ui/group"
import {
  Menu,
  MenuItem,
  MenuPopup,
  MenuTrigger,
} from "@/registry/default/ui/menu"

export default function GroupDefaultButton() {
  return (
    <Group aria-label="File actions">
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
      <Menu>
        <MenuTrigger render={<Button size="icon" aria-label="Menu" />}>
          <EllipsisIcon className="size-4" />
        </MenuTrigger>
        <MenuPopup align="end">
          <MenuItem>
            <EditIcon />
            Edit
          </MenuItem>
          <MenuItem>
            <ArchiveIcon />
            Archive
          </MenuItem>
          <MenuItem>
            <ShareIcon />
            Share
          </MenuItem>
          <MenuItem variant="destructive">
            <TrashIcon />
            Delete
          </MenuItem>
        </MenuPopup>
      </Menu>
    </Group>
  )
}
