import type { MobileSmsSummary } from "@coss/companion";
import { formatAgo } from "../lib/format";
import { SMS_STATUS_LABELS, SMS_STATUS_TONE } from "../lib/status";
import type { EnvironmentParams } from "../lib/web";
import { StatusDot } from "./badge";
import { ListRow } from "./panel";

export function SmsRow(props: { sms: MobileSmsSummary; params: EnvironmentParams }) {
  const { sms } = props;
  return (
    <ListRow
      detail={formatAgo(sms.created_at)}
      href={{
        pathname: "/[org]/projects/[project]/[env]/sms/[id]",
        params: { ...props.params, id: sms.id },
      }}
      leading={<StatusDot tone={SMS_STATUS_TONE[sms.status]} />}
      subtitle={`${SMS_STATUS_LABELS[sms.status]} · ${sms.preview || "—"}`}
      title={sms.to}
    />
  );
}
