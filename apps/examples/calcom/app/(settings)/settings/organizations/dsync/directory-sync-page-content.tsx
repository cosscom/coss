"use client";

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
import { PlusIcon } from "lucide-react";
import { useState } from "react";
import { CopyableField } from "../../developer/oauth/copyable-field";
import { ConfigureDirectorySyncDialog } from "./configure-directory-sync-dialog";
import {
  DirectorySyncTeamMapping,
  type TeamDirectoryRow,
} from "./directory-sync-team-mapping";
import {
  AppHeader,
  AppHeaderContent,
  AppHeaderDescription,
} from "@/components/app/app-header";

const MOCK_SCIM_BASE_URL =
  "http://localhost:3000/api/scim/v2.0/7e676752-55b4-4cdc-8f45-9a82e060df12";
const MOCK_SCIM_BEARER_TOKEN = "lsM4BTx47bqaL70530CSJg";

const INITIAL_TEAM_ROWS: TeamDirectoryRow[] = [
  { groupNames: ["fdg"], id: "1", teamName: "Team 1" },
  { groupNames: [], id: "2", teamName: "one more" },
];

export function DirectorySyncPageContent() {
  const [configureOpen, setConfigureOpen] = useState(false);
  const [scimConfigured, setScimConfigured] = useState(false);

  return (
    <>
      <AppHeader>
        <AppHeaderContent title="Directory sync">
          <AppHeaderDescription>
            Provision and de-provision users with your directory provider.
          </AppHeaderDescription>
        </AppHeaderContent>
      </AppHeader>
      <div className="flex flex-col gap-4">
        {!scimConfigured ? (
          <Card>
            <CardPanel>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <CardFrameDescription>
                    Configure an identity provider to get started with SCIM.
                  </CardFrameDescription>
                </div>
                <Button onClick={() => setConfigureOpen(true)} type="button">
                  Configure
                </Button>
              </div>
            </CardPanel>
          </Card>
        ) : (
          <>
            <CardFrame>
              <CardFrameHeader>
                <CardFrameTitle>SCIM credentials</CardFrameTitle>
                <CardFrameDescription>
                  Your Identity Provider will ask for the following information
                  to configure SCIM. Follow the instructions to finish the
                  setup.
                </CardFrameDescription>
              </CardFrameHeader>
              <Card className="rounded-b-none!">
                <CardPanel className="flex flex-col gap-6">
                  <CopyableField
                    aria-label="SCIM base URL"
                    label="SCIM Base URL"
                    value={MOCK_SCIM_BASE_URL}
                  />
                  <CopyableField
                    aria-label="SCIM bearer token"
                    label="SCIM Bearer Token"
                    value={MOCK_SCIM_BEARER_TOKEN}
                  />
                </CardPanel>
              </Card>
            </CardFrame>

            <CardFrame>
              <CardFrameHeader>
                <CardFrameTitle>Teams</CardFrameTitle>
                <CardFrameAction>
                  <Button type="button" variant="outline">
                    <PlusIcon aria-hidden="true" />
                    Create team
                  </Button>
                </CardFrameAction>
              </CardFrameHeader>
              <CardFrame className="w-full">
                <DirectorySyncTeamMapping initialRows={INITIAL_TEAM_ROWS} />
              </CardFrame>
            </CardFrame>
          </>
        )}
      </div>
      <ConfigureDirectorySyncDialog
        onConfigured={() => setScimConfigured(true)}
        onOpenChange={setConfigureOpen}
        open={configureOpen}
      />
    </>
  );
}
