/**
 * Organization access control (client-safe: only imports Better Auth's `access` subpaths).
 *
 * - Custom roles REPLACE Better Auth's defaults on the server, so owner/admin/member are all
 *   defined here by spreading the default role *statements* (`ownerAc.statements`, not `ownerAc`).
 * - The `apiKey` resource name and its actions are required verbatim by @better-auth/api-key for
 *   organization-owned keys.
 */
import { createAccessControl } from "better-auth/plugins/access";
import {
  adminAc,
  defaultStatements,
  memberAc,
  ownerAc,
} from "better-auth/plugins/organization/access";

export const orgStatements = {
  ...defaultStatements,
  project: ["create", "read", "update", "delete"],
  environment: ["create", "read", "update", "delete"],
  apiKey: ["create", "read", "update", "delete"],
  email: ["send", "read"],
} as const;

export const orgAc = createAccessControl(orgStatements);

const fullCossAccess = {
  project: ["create", "read", "update", "delete"],
  environment: ["create", "read", "update", "delete"],
  apiKey: ["create", "read", "update", "delete"],
  email: ["send", "read"],
} as const;

const readOnlyCossAccess = {
  project: ["read"],
  environment: ["read"],
  apiKey: ["read"],
  email: ["read"],
} as const;

export const orgRoles = {
  owner: orgAc.newRole({ ...ownerAc.statements, ...fullCossAccess }),
  admin: orgAc.newRole({ ...adminAc.statements, ...fullCossAccess }),
  member: orgAc.newRole({ ...memberAc.statements, ...readOnlyCossAccess }),
};

export type OrgRole = keyof typeof orgRoles;

export type OrgPermissions = {
  [Resource in keyof typeof orgStatements]?: (typeof orgStatements)[Resource][number][];
};

/** Roles an organization admin may grant through invitations (owner is never invitable). */
export const INVITABLE_ORG_ROLES = ["admin", "member"] as const;
export type InvitableOrgRole = (typeof INVITABLE_ORG_ROLES)[number];

export function isOrgRole(name: string): name is OrgRole {
  return Object.hasOwn(orgRoles, name);
}

/**
 * Local permission check for a member's role string (Better Auth stores multiple roles
 * comma-joined). Static roles only — use this when the member row is already loaded.
 * Role names must match exactly: Better Auth does not trim them, so neither do we.
 */
export function orgRoleCan(role: string | null | undefined, permissions: OrgPermissions): boolean {
  if (!role) return false;
  return role
    .split(",")
    .some((name) => isOrgRole(name) && orgRoles[name].authorize(permissions).success);
}
