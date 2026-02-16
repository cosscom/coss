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
import { Field, FieldLabel } from "@/registry/default/ui/field";
import { Form } from "@/registry/default/ui/form";
import { Input } from "@/registry/default/ui/input";

export default function Particle() {
  return (
    <Drawer>
      <DrawerTrigger render={<Button variant="outline" />}>
        Open Drawer
      </DrawerTrigger>
      <DrawerPopup>
        <Form className="contents">
          <DrawerHeader>
            <DrawerTitle>Edit profile</DrawerTitle>
            <DrawerDescription>
              Make changes to your profile here. Click save when you&apos;re
              done.
            </DrawerDescription>
          </DrawerHeader>
          <DrawerPanel className="grid gap-4">
            <Field>
              <FieldLabel>Name</FieldLabel>
              <Input defaultValue="Margaret Welsh" type="text" />
            </Field>
            <Field>
              <FieldLabel>Username</FieldLabel>
              <Input defaultValue="@maggie.welsh" type="text" />
            </Field>
          </DrawerPanel>
          <DrawerFooter>
            <DrawerClose render={<Button variant="ghost" />}>
              Cancel
            </DrawerClose>
            <Button type="submit">Save</Button>
          </DrawerFooter>
        </Form>
      </DrawerPopup>
    </Drawer>
  );
}
