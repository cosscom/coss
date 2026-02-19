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
import { ApiKeysEmpty } from "./api-keys-empty";
import type { ApiKeyItem } from "./api-keys-list";
import { ApiKeysList } from "./api-keys-list";
import { EditApiKeyDialog } from "./edit-api-key-dialog";
import { NewApiKeyDialog } from "./new-api-key-dialog";

const initialMockApiKeys: ApiKeyItem[] = [
  {
    createdAt: "2025-11-15T10:30:00Z",
    expiresAt: null,
    id: "1",
    key: "cal_live_mock_key_1",
    neverExpires: true,
    note: "Production API",
  },
  {
    createdAt: "2026-01-20T14:00:00Z",
    expiresAt: "2026-07-20T14:00:00Z",
    id: "2",
    key: "cal_live_mock_key_2",
    neverExpires: false,
    note: "Development testing",
  },
];

export function ApiKeysPageContent() {
  const [apiKeys, setApiKeys] = useState<ApiKeyItem[]>(initialMockApiKeys);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingKey, setEditingKey] = useState<ApiKeyItem | null>(null);
  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false);
  const [keyToRevoke, setKeyToRevoke] = useState<ApiKeyItem | null>(null);

  const hasApiKeys = apiKeys.length > 0;

  function handleEditClick(apiKey: ApiKeyItem) {
    setEditingKey(apiKey);
    setEditDialogOpen(true);
  }

  function handleRemoveClick(apiKey: ApiKeyItem) {
    setKeyToRevoke(apiKey);
    setRevokeDialogOpen(true);
  }

  function handleRevokeConfirm() {
    if (keyToRevoke) {
      setApiKeys((prev) => prev.filter((k) => k.id !== keyToRevoke.id));
      setKeyToRevoke(null);
    }
    setRevokeDialogOpen(false);
  }

  function handleRevokeDialogOpenChange(open: boolean) {
    if (!open) {
      setKeyToRevoke(null);
    }
    setRevokeDialogOpen(open);
  }

  return (
    <>
      <CardFrame>
        <CardFrameHeader>
          <CardFrameTitle>API Keys</CardFrameTitle>
          <CardFrameDescription>
            Create and manage API keys for authenticating with the Cal.com API
          </CardFrameDescription>
          {hasApiKeys && (
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
            {hasApiKeys ? (
              <ApiKeysList
                apiKeys={apiKeys}
                onEditClick={handleEditClick}
                onRemoveClick={handleRemoveClick}
              />
            ) : (
              <ApiKeysEmpty onNewClick={() => setCreateDialogOpen(true)} />
            )}
          </CardPanel>
        </Card>

        <NewApiKeyDialog
          onOpenChange={setCreateDialogOpen}
          open={createDialogOpen}
        />
      </CardFrame>

      <EditApiKeyDialog
        apiKey={editingKey}
        onOpenChange={setEditDialogOpen}
        open={editDialogOpen}
      />

      <AlertDialog
        onOpenChange={handleRevokeDialogOpenChange}
        open={revokeDialogOpen}
      >
        <AlertDialogPopup>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Permanently remove this API key from your account?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the API key. Any applications using
              this key will immediately lose access to your account. This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogClose render={<Button variant="ghost" />}>
              Cancel
            </AlertDialogClose>
            <AlertDialogClose
              onClick={handleRevokeConfirm}
              render={
                <Button variant="destructive">Revoke this API key</Button>
              }
            />
          </AlertDialogFooter>
        </AlertDialogPopup>
      </AlertDialog>
    </>
  );
}
