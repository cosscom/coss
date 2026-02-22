import { Button } from "@coss/ui/components/button";
import {
  Card,
  CardFrame,
  CardFrameAction,
  CardFrameDescription,
  CardFrameHeader,
  CardFrameTitle,
  CardPanel,
} from "@coss/ui/components/card";
import { PlusIcon } from "lucide-react";
import { ConferencingEmpty } from "./conferencing-empty";

export default function ConferencingSettingsPage() {
  return (
    <CardFrame>
      <CardFrameHeader>
        <CardFrameTitle>Conferencing</CardFrameTitle>
        <CardFrameDescription>
          Add your favourite video conferencing apps for your meetings
        </CardFrameDescription>
        <CardFrameAction>
          <Button variant="outline">
            <PlusIcon />
            Add
          </Button>
        </CardFrameAction>
      </CardFrameHeader>

      <Card>
        <CardPanel className="p-0">
          <ConferencingEmpty />
        </CardPanel>
      </Card>
    </CardFrame>
  );
}
