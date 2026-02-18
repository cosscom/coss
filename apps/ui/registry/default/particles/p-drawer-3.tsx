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
  return (
    <div className="flex flex-wrap gap-2">
      <Drawer>
        <DrawerTrigger render={<Button variant="outline" />}>
          Open Right
        </DrawerTrigger>
        <DrawerPopup showCloseButton={false}>
          <DrawerHeader>
            <DrawerTitle>Right</DrawerTitle>
            <DrawerDescription>Right side of the screen.</DrawerDescription>
          </DrawerHeader>
          <DrawerPanel>
            <p>
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do
              eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut
              enim ad minim veniam, quis nostrud exercitation ullamco laboris
              nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in
              reprehenderit in voluptate velit esse cillum dolore eu fugiat
              nulla pariatur. Excepteur sint occaecat cupidatat non proident,
              sunt in culpa qui officia deserunt mollit anim id est laborum.
            </p>
          </DrawerPanel>
        </DrawerPopup>
      </Drawer>
      <Drawer side="left">
        <DrawerTrigger render={<Button variant="outline" />}>
          Open Left
        </DrawerTrigger>
        <DrawerPopup showCloseButton={false} side="left">
          <DrawerHeader>
            <DrawerTitle>Left</DrawerTitle>
            <DrawerDescription>Left side of the screen.</DrawerDescription>
          </DrawerHeader>
          <DrawerPanel>
            <p>
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do
              eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut
              enim ad minim veniam, quis nostrud exercitation ullamco laboris
              nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in
              reprehenderit in voluptate velit esse cillum dolore eu fugiat
              nulla pariatur. Excepteur sint occaecat cupidatat non proident,
              sunt in culpa qui officia deserunt mollit anim id est laborum.
            </p>
          </DrawerPanel>
        </DrawerPopup>
      </Drawer>
      <Drawer side="top">
        <DrawerTrigger render={<Button variant="outline" />}>
          Open Top
        </DrawerTrigger>
        <DrawerPopup showCloseButton={false} side="top">
          <DrawerHeader>
            <DrawerTitle>Top</DrawerTitle>
            <DrawerDescription>Top of the screen.</DrawerDescription>
          </DrawerHeader>
          <DrawerPanel>
            <p>
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do
              eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut
              enim ad minim veniam, quis nostrud exercitation ullamco laboris
              nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in
              reprehenderit in voluptate velit esse cillum dolore eu fugiat
              nulla pariatur. Excepteur sint occaecat cupidatat non proident,
              sunt in culpa qui officia deserunt mollit anim id est laborum.
            </p>
          </DrawerPanel>
        </DrawerPopup>
      </Drawer>
      <Drawer side="bottom">
        <DrawerTrigger render={<Button variant="outline" />}>
          Open Bottom
        </DrawerTrigger>
        <DrawerPopup showCloseButton={false} side="bottom">
          <DrawerHeader>
            <DrawerTitle>Bottom</DrawerTitle>
            <DrawerDescription>Bottom of the screen.</DrawerDescription>
          </DrawerHeader>
          <DrawerPanel>
            <p>
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do
              eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut
              enim ad minim veniam, quis nostrud exercitation ullamco laboris
              nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in
              reprehenderit in voluptate velit esse cillum dolore eu fugiat
              nulla pariatur. Excepteur sint occaecat cupidatat non proident,
              sunt in culpa qui officia deserunt mollit anim id est laborum.
            </p>
          </DrawerPanel>
        </DrawerPopup>
      </Drawer>
    </div>
  );
}
