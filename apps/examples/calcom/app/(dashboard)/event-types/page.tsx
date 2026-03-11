import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@coss/ui/components/input-group";
import { PlusIcon, SearchIcon } from "lucide-react";
import { AddEventTypeDialog } from "./add-event-type-dialog";
import { EventTypesList } from "./event-types-list";
import {
  AppHeader,
  AppHeaderActions,
  AppHeaderContent,
  AppHeaderDescription,
} from "@/components/app/app-header";

export default function Page() {
  return (
    <>
      <AppHeader>
        <AppHeaderContent title="Event Types">
          <AppHeaderDescription>
            Create events to share for people to book on your calendar.
          </AppHeaderDescription>
        </AppHeaderContent>
        <AppHeaderActions className="max-md:hidden">
          <InputGroup>
            <InputGroupInput
              aria-label="Search"
              placeholder="Search…"
              type="search"
            />
            <InputGroupAddon>
              <SearchIcon />
            </InputGroupAddon>
          </InputGroup>
          <AddEventTypeDialog>
            <PlusIcon className="-ms-1" />
            New
          </AddEventTypeDialog>
        </AppHeaderActions>
      </AppHeader>

      <EventTypesList />
    </>
  );
}
