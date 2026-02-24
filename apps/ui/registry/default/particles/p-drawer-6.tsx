import { Button } from "@/registry/default/ui/button";
import {
  Drawer,
  DrawerHeader,
  DrawerPanel,
  DrawerPopup,
  DrawerTitle,
  DrawerTrigger,
} from "@/registry/default/ui/drawer";

export default function Particle() {
  return (
    <Drawer side="bottom">
      <DrawerTrigger render={<Button variant="outline" />}>
        Open Bottom Drawer
      </DrawerTrigger>
      <DrawerPopup showBar showCloseButton={false}>
        <DrawerHeader className="items-center" preventSwipe>
          <DrawerTitle>Bottom Drawer</DrawerTitle>
        </DrawerHeader>
        <DrawerPanel>
          <p className="text-muted-foreground text-sm">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do
            eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim
            ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut
            aliquip ex ea commodo consequat. Duis aute irure dolor in
            reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla
            pariatur.
          </p>
        </DrawerPanel>
      </DrawerPopup>
    </Drawer>
  );
}
