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

export default function Particle() {
  const snapPoints = ["148px", 1] as const;
  const [snapPoint, setSnapPoint] = useState<
    (typeof snapPoints)[number] | null
  >(snapPoints[0]);

  return (
    <Drawer
      onSnapPointChange={(point) =>
        setSnapPoint(point as (typeof snapPoints)[number] | null)
      }
      side="bottom"
      snapPoint={snapPoint}
      snapPoints={[...snapPoints]}
    >
      <DrawerTrigger render={<Button variant="outline" />}>
        Open Bottom Drawer
      </DrawerTrigger>
      <DrawerPopup showCloseButton={false} side="bottom">
        <DrawerHeader>
          <DrawerTitle>Snap Points</DrawerTitle>
          <DrawerDescription>
            This drawer snaps to predefined positions. Drag to resize.
          </DrawerDescription>
        </DrawerHeader>
        <DrawerPanel>
          <div className="grid gap-4">
            <p>
              This drawer uses snap points to lock into specific heights. The
              first snap point is at 148px, and the second expands to
              full-screen.
            </p>
            <p>
              Try dragging the drawer up and down to see it snap between
              positions. You can also flick quickly to skip between snap points.
            </p>
            <p className="text-muted-foreground text-sm">
              Current snap point: {snapPoint ?? "none"}
            </p>
          </div>
        </DrawerPanel>
      </DrawerPopup>
    </Drawer>
  );
}
