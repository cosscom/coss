// The signed-in user's own account (`/api/mobile/v1/account/*`).

export type AccountDeletionOrganization = { name: string; slug: string };

/** `GET /account/deletion`: what deleting the account would do now. */
export type AccountDeletionResponse = {
  /** Organizations the user is the only member of: deleted with the account. */
  delete_organizations: AccountDeletionOrganization[];
  /** Organizations shared with others: the user leaves them. */
  leave_organizations: AccountDeletionOrganization[];
  /** Why the account can't be deleted now, one sentence each; empty when it can. */
  blockers: string[];
};

/** `POST /account/deletion`: the user's email address, typed to confirm. */
export type DeleteAccountRequest = { confirm: string };

export type DeleteAccountResponse = { deleted: true };
