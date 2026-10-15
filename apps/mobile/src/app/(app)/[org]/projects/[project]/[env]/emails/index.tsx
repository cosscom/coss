import type { EmailStatus } from "@coss/companion";
import { formatRetentionDays, RETENTION_DAYS } from "@coss/retention";
import { Stack, useLocalSearchParams } from "expo-router";
import { Mail } from "lucide-react-native";
import { useState } from "react";
import { EmailRow } from "../../../../../../../components/email-row";
import { type Filter, FilterChips } from "../../../../../../../components/filters";
import { PagedPanel } from "../../../../../../../components/paged";
import { PageIntro, Screen } from "../../../../../../../components/screen";
import { WebButton } from "../../../../../../../components/web-button";
import { useEmails } from "../../../../../../../lib/queries";
import { EMAIL_STATUS_LABELS, EMAIL_STATUS_TONE } from "../../../../../../../lib/status";
import { type EnvironmentParams, environmentPath } from "../../../../../../../lib/web";

const STATUSES: EmailStatus[] = ["sent", "failed", "queued", "scheduled", "canceled"];
const FILTERS: Filter<EmailStatus>[] = [
  { value: null, label: "All" },
  ...STATUSES.map((status) => ({
    value: status,
    label: EMAIL_STATUS_LABELS[status],
    tone: EMAIL_STATUS_TONE[status],
  })),
];

export default function EmailsScreen() {
  const params = useLocalSearchParams<EnvironmentParams>();
  const [status, setStatus] = useState<EmailStatus | null>(null);
  const emails = useEmails(params, status);
  const items = emails.data?.pages.flatMap((page) => page.data) ?? [];
  return (
    <Screen
      onRefresh={() => void emails.refetch()}
      refreshing={emails.isRefetching && !emails.isFetchingNextPage}
      title="Emails"
    >
      <Stack.Screen
        options={{ headerRight: () => <WebButton path={`${environmentPath(params)}/emails`} /> }}
      />
      <PageIntro
        description={`Emails sent with this environment's keys. Emails are kept for ${formatRetentionDays(RETENTION_DAYS.emails)}.`}
        title="Emails"
      />
      <FilterChips items={FILTERS} onChange={setStatus} value={status} />
      <PagedPanel
        empty={{
          icon: Mail,
          title: status ? "Nothing here" : "No emails yet",
          description: status
            ? "No emails with this status."
            : "Emails sent with this environment's keys show up here.",
        }}
        items={items}
        olderLabel="Older emails"
        query={emails}
        render={(email) => <EmailRow email={email} key={email.id} params={params} />}
      />
    </Screen>
  );
}
