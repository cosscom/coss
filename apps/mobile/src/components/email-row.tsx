import type { MobileEmailSummary } from "@coss/companion";
import { formatAgo } from "../lib/format";
import { EMAIL_STATUS_LABELS, EMAIL_STATUS_TONE } from "../lib/status";
import type { EnvironmentParams } from "../lib/web";
import { StatusDot } from "./badge";
import { ListRow } from "./panel";

export function EmailRow(props: { email: MobileEmailSummary; params: EnvironmentParams }) {
  const { email } = props;
  return (
    <ListRow
      detail={formatAgo(email.created_at)}
      href={{
        pathname: "/[org]/projects/[project]/[env]/emails/[id]",
        params: { ...props.params, id: email.id },
      }}
      leading={<StatusDot tone={EMAIL_STATUS_TONE[email.status]} />}
      subtitle={`${EMAIL_STATUS_LABELS[email.status]} · ${email.to.join(", ")}`}
      title={email.content_discarded_at ? "Content not stored" : email.subject || "(no subject)"}
    />
  );
}
