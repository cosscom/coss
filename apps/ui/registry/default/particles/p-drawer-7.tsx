import { Button } from "@/registry/default/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerDescription,
  DrawerFooter,
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
        Open drawer
      </DrawerTrigger>
      <DrawerPopup showBar showCloseButton={false} variant="inset">
        <DrawerHeader className="items-center">
          <DrawerTitle>Account</DrawerTitle>
          <DrawerDescription>
            Nested drawers stack on top of each other. Try opening the one
            below.
          </DrawerDescription>
        </DrawerHeader>
        <DrawerPanel>
          <div aria-hidden className="grid gap-3">
            <div className="h-12 rounded-xl border bg-muted/50" />
            <div className="h-12 rounded-xl border bg-muted/50" />
            <div className="h-12 rounded-xl border bg-muted/50" />
            <div className="h-12 rounded-xl border bg-muted/50" />
          </div>
        </DrawerPanel>
        <DrawerFooter variant="bare">
          <Drawer side="bottom">
            <DrawerTrigger render={<Button variant="outline" />}>
              Security settings
            </DrawerTrigger>
            <DrawerPopup showBar showCloseButton={false} variant="inset">
              <DrawerHeader className="items-center">
                <DrawerTitle>Security</DrawerTitle>
                <DrawerDescription>
                  Review sign-in activity and update your security preferences.
                </DrawerDescription>
              </DrawerHeader>
              <DrawerPanel>
                <ul className="list-disc pl-5 text-sm">
                  <li>Passkeys enabled</li>
                  <li>2FA via authenticator app</li>
                  <li>3 signed-in devices</li>
                </ul>
              </DrawerPanel>
              <DrawerFooter variant="bare">
                <Drawer side="bottom">
                  <DrawerTrigger render={<Button variant="outline" />}>
                    Privacy settings
                  </DrawerTrigger>
                  <DrawerPopup showBar showCloseButton={false} variant="inset">
                    <DrawerHeader className="items-center">
                      <DrawerTitle>Privacy</DrawerTitle>
                      <DrawerDescription>
                        Manage your data sharing and visibility preferences.
                      </DrawerDescription>
                    </DrawerHeader>
                    <DrawerPanel>
                      <ul className="list-disc pl-5 text-sm">
                        <li>Profile visible to contacts only</li>
                        <li>Activity status hidden</li>
                        <li>Data export available</li>
                      </ul>
                    </DrawerPanel>
                    <DrawerFooter variant="bare">
                      <Drawer side="bottom">
                        <DrawerTrigger render={<Button variant="outline" />}>
                          Notifications
                        </DrawerTrigger>
                        <DrawerPopup
                          showBar
                          showCloseButton={false}
                          variant="inset"
                        >
                          <DrawerHeader className="items-center">
                            <DrawerTitle>Notifications</DrawerTitle>
                            <DrawerDescription>
                              Choose how and when you want to be notified.
                            </DrawerDescription>
                          </DrawerHeader>
                          <DrawerFooter variant="bare">
                            <DrawerClose render={<Button variant="outline" />}>
                              Close
                            </DrawerClose>
                          </DrawerFooter>
                        </DrawerPopup>
                      </Drawer>
                    </DrawerFooter>
                  </DrawerPopup>
                </Drawer>
              </DrawerFooter>
            </DrawerPopup>
          </Drawer>
        </DrawerFooter>
      </DrawerPopup>
    </Drawer>
  );
}
