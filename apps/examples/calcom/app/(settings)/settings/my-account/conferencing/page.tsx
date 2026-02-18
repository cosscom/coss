import { Badge } from "@coss/ui/components/badge";
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
import {
  Menu,
  MenuItem,
  MenuPopup,
  MenuTrigger,
} from "@coss/ui/components/menu";
import {
  Tooltip,
  TooltipPopup,
  TooltipTrigger,
} from "@coss/ui/components/tooltip";
import { EllipsisIcon, PencilIcon, PlusIcon, VideoIcon } from "lucide-react";
import Image from "next/image";
import {
  ListItem,
  ListItemActions,
  ListItemContent,
  ListItemDescription,
  ListItemHeader,
  ListItemTitle,
} from "@/components/list-item";

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

      <Card className="rounded-b-none!">
        <CardPanel className="p-0">
          <ListItem>
            <ListItemContent>
              <ListItemHeader>
                <div className="flex items-start gap-4">
                  <Image
                    alt="Cal Video"
                    className="size-10 shrink-0"
                    height={40}
                    src="https://app.cal.com/app-store/dailyvideo/icon.svg"
                    width={40}
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <ListItemTitle>Cal Video</ListItemTitle>
                      <Badge variant="success">Default</Badge>
                    </div>
                    <ListItemDescription>
                      Cal Video is the in-house web-based video conferencing
                      platform powered by Daily.co, which is minimalistic and
                      lightweight, but has most of the features you need.
                    </ListItemDescription>
                  </div>
                </div>
              </ListItemHeader>
            </ListItemContent>
            <ListItemActions>
              <Menu>
                <Tooltip>
                  <MenuTrigger
                    render={
                      <TooltipTrigger
                        render={
                          <Button
                            aria-label="Options"
                            size="icon"
                            variant="outline"
                          >
                            <EllipsisIcon />
                          </Button>
                        }
                      />
                    }
                  />
                  <TooltipPopup>Options</TooltipPopup>
                </Tooltip>
                <MenuPopup align="end">
                  <MenuItem disabled>
                    <PencilIcon />
                    Set as default
                  </MenuItem>
                  <MenuItem variant="destructive">
                    <VideoIcon />
                    Remove app
                  </MenuItem>
                </MenuPopup>
              </Menu>
            </ListItemActions>
          </ListItem>
          <ListItem>
            <ListItemContent>
              <ListItemHeader>
                <div className="flex items-start gap-4">
                  <Image
                    alt="Google Meet"
                    className="size-10 shrink-0"
                    height={40}
                    src="https://app.cal.com/app-store/googlevideo/logo.webp"
                    width={40}
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <ListItemTitle>Google Meet</ListItemTitle>
                    </div>
                    <ListItemDescription>
                      Google Meet is Google's web-based video conferencing
                      platform, designed to compete with major conferencing
                      platforms.
                    </ListItemDescription>
                  </div>
                </div>
              </ListItemHeader>
            </ListItemContent>
            <ListItemActions>
              <Menu>
                <Tooltip>
                  <MenuTrigger
                    render={
                      <TooltipTrigger
                        render={
                          <Button
                            aria-label="Options"
                            size="icon"
                            variant="outline"
                          >
                            <EllipsisIcon />
                          </Button>
                        }
                      />
                    }
                  />
                  <TooltipPopup>Options</TooltipPopup>
                </Tooltip>
                <MenuPopup align="end">
                  <MenuItem>
                    <PencilIcon />
                    Set as default
                  </MenuItem>
                  <MenuItem variant="destructive">
                    <VideoIcon />
                    Remove app
                  </MenuItem>
                </MenuPopup>
              </Menu>
            </ListItemActions>
          </ListItem>
        </CardPanel>
      </Card>
    </CardFrame>
  );
}
