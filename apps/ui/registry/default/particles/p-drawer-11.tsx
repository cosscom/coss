import Link from "next/link";
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
    <Drawer position="left">
      <DrawerTrigger render={<Button variant="outline" />}>
        Open menu
      </DrawerTrigger>
      <DrawerPopup showCloseButton variant="straight">
        <DrawerHeader>
          <DrawerTitle>Menu</DrawerTitle>
        </DrawerHeader>
        <DrawerPanel>
          <nav className="-mx-[calc(--spacing(3)-1px)] flex flex-col gap-0.5">
            <Button
              className="justify-start"
              render={<Link href="#" />}
              variant="ghost"
            >
              Home
            </Button>
            <Button
              className="justify-start"
              render={<Link href="#" />}
              variant="ghost"
            >
              Profile
            </Button>
            <Button
              className="justify-start"
              render={<Link href="#" />}
              variant="ghost"
            >
              Settings
            </Button>
            <Button
              className="justify-start"
              render={<Link href="#" />}
              variant="ghost"
            >
              Sign out
            </Button>
          </nav>
        </DrawerPanel>
      </DrawerPopup>
    </Drawer>
  );
}
