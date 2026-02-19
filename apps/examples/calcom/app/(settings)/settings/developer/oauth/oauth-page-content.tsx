"use client";

import {
  Card,
  CardFrame,
  CardFrameDescription,
  CardFrameHeader,
  CardFrameTitle,
  CardPanel,
} from "@coss/ui/components/card";
import { useState } from "react";
import { NewOAuthClientDialogRoot } from "./new-oauth-client-dialog";
import type { OAuthClientSubmittedData } from "./oauth-client-submitted-dialog";
import { OAuthClientSubmittedDialog } from "./oauth-client-submitted-dialog";
import { OAuthEmpty } from "./oauth-empty";

export function OAuthPageContent() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [submittedDialogOpen, setSubmittedDialogOpen] = useState(false);
  const [submittedData, setSubmittedData] =
    useState<OAuthClientSubmittedData | null>(null);

  function handleCreateSuccess(data: OAuthClientSubmittedData) {
    setCreateDialogOpen(false);
    setSubmittedData(data);
    setSubmittedDialogOpen(true);
  }

  return (
    <>
      <CardFrame>
        <CardFrameHeader>
          <CardFrameTitle>OAuth Clients</CardFrameTitle>
          <CardFrameDescription>
            Create and manage OAuth clients for third-party integrations
          </CardFrameDescription>
        </CardFrameHeader>

        <Card>
          <CardPanel className="p-0">
            <OAuthEmpty onNewClick={() => setCreateDialogOpen(true)} />
          </CardPanel>
        </Card>

        <NewOAuthClientDialogRoot
          onCreateSuccess={handleCreateSuccess}
          onOpenChange={setCreateDialogOpen}
          open={createDialogOpen}
        />
      </CardFrame>

      <OAuthClientSubmittedDialog
        data={submittedData}
        onOpenChange={setSubmittedDialogOpen}
        open={submittedDialogOpen}
      />
    </>
  );
}
