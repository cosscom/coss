import { Button } from "@coss/ui/components/button";
import {
  Card,
  CardFrame,
  CardFrameHeader,
  CardFrameTitle,
  CardPanel,
} from "@coss/ui/components/card";
import { Field, FieldDescription } from "@coss/ui/components/field";
import { Group } from "@coss/ui/components/group";
import { Input } from "@coss/ui/components/input";
import {
  AppHeader,
  AppHeaderContent,
  AppHeaderDescription,
} from "@/components/app/app-header";
import {
  ListItem,
  ListItemActions,
  ListItemContent,
  ListItemDescription,
  ListItemHeader,
  ListItemTitle,
} from "@/components/list-item";

const RECENT_IMPERSONATIONS = [
  {
    impersonatedAt: "2/23/2026 5:21:37 PM",
    user: "teampro",
  },
  {
    impersonatedAt: "2/23/2026 5:21:22 PM",
    user: "platformadmin2024!",
  },
];

export default function AdminImpersonationPage() {
  return (
    <>
      <AppHeader>
        <AppHeaderContent title="Admin">
          <AppHeaderDescription>Impersonation</AppHeaderDescription>
        </AppHeaderContent>
      </AppHeader>
      <div className="flex flex-col gap-4">
        <CardFrame>
          <CardFrameHeader>
            <CardFrameTitle>User impersonation</CardFrameTitle>
          </CardFrameHeader>
          <Card>
            <CardPanel>
              <Field>
                <Group aria-label="User impersonation" className="w-full gap-2">
                  <Input
                    defaultValue="http://localhost:3000/"
                    placeholder="http://localhost:3000/"
                  />
                  <div>
                    <Button>Impersonate</Button>
                  </div>
                </Group>
                <FieldDescription>
                  All uses of this feature is audited.
                </FieldDescription>
              </Field>
            </CardPanel>
          </Card>
        </CardFrame>

        <CardFrame>
          <CardFrameHeader>
            <CardFrameTitle>Recent impersonations</CardFrameTitle>
          </CardFrameHeader>
          <Card>
            <CardPanel className="p-0">
              {RECENT_IMPERSONATIONS.map((entry) => (
                <ListItem key={entry.user}>
                  <ListItemContent>
                    <ListItemHeader>
                      <ListItemTitle>{entry.user}</ListItemTitle>
                      <ListItemDescription>
                        {entry.impersonatedAt}
                      </ListItemDescription>
                    </ListItemHeader>
                  </ListItemContent>
                  <ListItemActions>
                    <Button variant="outline">Quick impersonate</Button>
                  </ListItemActions>
                </ListItem>
              ))}
            </CardPanel>
          </Card>
        </CardFrame>
      </div>
    </>
  );
}
