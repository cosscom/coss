"use client";

import { useState } from "react";

import { Button } from "@/registry/default/ui/button";
import {
  Drawer,
  DrawerDescription,
  DrawerHeader,
  DrawerPanel,
  DrawerPopup,
  DrawerTitle,
  DrawerTrigger,
} from "@/registry/default/ui/drawer";

const PLACEHOLDER_IDS = [
  "a",
  "b",
  "c",
  "d",
  "e",
  "f",
  "g",
  "h",
  "i",
  "j",
  "k",
  "l",
] as const;

export default function Particle() {
  const snapPoints = ["300px", 1] as const;
  const [snapPoint, setSnapPoint] = useState<
    (typeof snapPoints)[number] | null
  >(snapPoints[0]);

  return (
    <Drawer
      onSnapPointChange={(point) =>
        setSnapPoint(point as (typeof snapPoints)[number] | null)
      }
      side="top"
      snapPoint={snapPoint}
      snapPoints={[...snapPoints]}
      snapToSequentialPoints
    >
      <DrawerTrigger render={<Button variant="outline" />}>
        Open snap drawer
      </DrawerTrigger>
      <DrawerPopup showBar showCloseButton={false}>
        <DrawerHeader>
          <DrawerTitle>Snap Points</DrawerTitle>
          <DrawerDescription>
            Drag the drawer to snap between a compact peek and full-height view.
          </DrawerDescription>
        </DrawerHeader>
        <DrawerPanel>
          <div className="grid gap-3">
            {PLACEHOLDER_IDS.map((id) => (
              <div className="h-12 rounded-xl border bg-muted/50" key={id} />
            ))}
          </div>
        </DrawerPanel>
      </DrawerPopup>
    </Drawer>
  );
}
