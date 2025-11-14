import {
  ArchiveIcon,
  EditIcon,
  EllipsisIcon,
  FilesIcon,
  FilmIcon,
  ShareIcon,
  TrashIcon,
} from "lucide-react";

import { Button } from "@/registry/default/ui/button";
import { Group, GroupSeparator } from "@/registry/default/ui/group";
import {
  Menu,
  MenuItem,
  MenuPopup,
  MenuTrigger,
} from "@/registry/default/ui/menu";

export default function GroupWithDisabledButton() {
  return (
    <Group aria-label="File actions">
      <Button variant="outline">
        <FilesIcon />
        Files
      </Button>
      <GroupSeparator />
      <Button variant="outline" disabled>
        <FilmIcon />
        Media
      </Button>
      <GroupSeparator />
      <Menu>
        <MenuTrigger
          render={<Button variant="outline" size="icon" aria-label="Menu" />}
        >
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
  );
}
