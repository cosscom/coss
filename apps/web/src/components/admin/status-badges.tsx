import { Badge } from "@coss/ui/components/badge";

export function UserStatusBadge({ banned }: { banned: boolean }) {
  return banned ? <Badge variant="error">banned</Badge> : <Badge variant="success">active</Badge>;
}

export function PlatformRoleBadge({ role }: { role: string | null }) {
  const isAdmin = (role ?? "").split(",").some((name) => name.trim() === "admin");
  return <Badge variant={isAdmin ? "info" : "outline"}>{isAdmin ? "admin" : "user"}</Badge>;
}

export function OrganizationStatusBadge(props: { suspended: boolean; deleting?: boolean }) {
  if (props.deleting) return <Badge variant="error">deleting</Badge>;
  return props.suspended ? (
    <Badge variant="error">suspended</Badge>
  ) : (
    <Badge variant="success">active</Badge>
  );
}
