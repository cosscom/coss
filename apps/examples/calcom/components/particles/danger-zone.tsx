import { Button } from "@coss/ui/components/button";
import {
  CardFrame,
  CardFrameDescription,
  CardFrameFooter,
  CardFrameHeader,
  CardFrameTitle,
} from "@coss/ui/components/card";

interface DangerZoneProps {
  description: string;
  buttonLabel: string;
  onAction?: () => void;
}

export function DangerZone({
  description,
  buttonLabel,
  onAction,
}: DangerZoneProps) {
  return (
    <CardFrame className="flex-row items-center justify-between">
      <CardFrameHeader>
        <CardFrameTitle>Danger zone</CardFrameTitle>
        <CardFrameDescription>{description}</CardFrameDescription>
      </CardFrameHeader>

      <CardFrameFooter className="flex justify-end">
        <Button onClick={onAction} variant="destructive-outline">
          {buttonLabel}
        </Button>
      </CardFrameFooter>
    </CardFrame>
  );
}
