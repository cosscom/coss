"use client";

import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogPopup,
  AlertDialogTitle,
} from "@coss/ui/components/alert-dialog";
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
import { EditOAuthClientDialog } from "./edit-oauth-client-dialog";
import { NewOAuthClientDialogRoot } from "./new-oauth-client-dialog";
import type { OAuthClientItem } from "./oauth-clients-list";
import { OAuthClientsList } from "./oauth-clients-list";
import { OAuthEmpty } from "./oauth-empty";

const initialMockClients: OAuthClientItem[] = [
  {
    clientId: "cl_mock_1",
    clientSecret: "cs_mock_1",
    id: "1",
    name: "Slack Integration",
    purpose: "Sync availability and book meetings from Slack",
    redirectUri: "https://example.com/callback",
    status: "approved",
    usePkce: false,
    websiteUrl: "https://example.com",
  },
  {
    clientId: "cl_mock_2",
    clientSecret: "cs_mock_2",
    id: "2",
    name: "Cal.com Mobile App",
    purpose: "Native mobile app for iOS and Android",
    redirectUri: "http://localhost:3000/callback",
    status: "pending",
    usePkce: true,
    websiteUrl: "http://localhost:3000",
  },
];

export function OAuthPageContent() {
  const [clients, setClients] = useState<OAuthClientItem[]>(initialMockClients);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<OAuthClientItem | null>(
    null,
  );
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [clientToRemove, setClientToRemove] = useState<OAuthClientItem | null>(
    null,
  );

  const hasClients = clients.length > 0;

  function handleEditClick(client: OAuthClientItem) {
    setEditingClient(client);
    setEditDialogOpen(true);
  }

  function handleRemoveClick(client: OAuthClientItem) {
    setClientToRemove(client);
    setRemoveDialogOpen(true);
  }

  function handleRemoveConfirm() {
    if (clientToRemove) {
      setClients((prev) => prev.filter((c) => c.id !== clientToRemove.id));
      setClientToRemove(null);
    }
    setRemoveDialogOpen(false);
  }

  function handleRemoveDialogOpenChange(open: boolean) {
    if (!open) {
      setClientToRemove(null);
    }
    setRemoveDialogOpen(open);
  }

  return (
    <>
      <CardFrame>
        <CardFrameHeader>
          <CardFrameTitle>OAuth Clients</CardFrameTitle>
          <CardFrameDescription>
            Create and manage OAuth clients for third-party integrations
          </CardFrameDescription>
          {hasClients && (
            <CardFrameAction>
              <Button
                onClick={() => setCreateDialogOpen(true)}
                variant="outline"
              >
                <PlusIcon />
                New
              </Button>
            </CardFrameAction>
          )}
        </CardFrameHeader>

        <Card>
          <CardPanel className="p-0">
            {hasClients ? (
              <OAuthClientsList
                clients={clients}
                onEditClick={handleEditClick}
                onRemoveClick={handleRemoveClick}
              />
            ) : (
              <OAuthEmpty onNewClick={() => setCreateDialogOpen(true)} />
            )}
          </CardPanel>
        </Card>

        <NewOAuthClientDialogRoot
          onOpenChange={setCreateDialogOpen}
          open={createDialogOpen}
        />
      </CardFrame>

      <EditOAuthClientDialog
        client={editingClient}
        onOpenChange={setEditDialogOpen}
        open={editDialogOpen}
      />

      <AlertDialog
        onOpenChange={handleRemoveDialogOpenChange}
        open={removeDialogOpen}
      >
        <AlertDialogPopup>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove OAuth client</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this OAuth client? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogClose render={<Button variant="ghost" />}>
              Cancel
            </AlertDialogClose>
            <AlertDialogClose
              onClick={handleRemoveConfirm}
              render={<Button variant="destructive">Remove</Button>}
            />
          </AlertDialogFooter>
        </AlertDialogPopup>
      </AlertDialog>
    </>
  );
}
