import { Stack, useLocalSearchParams } from "expo-router";
import { Ban } from "lucide-react-native";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Badge } from "../../../../../../components/badge";
import { ModeBadge } from "../../../../../../components/mode-badge";
import { PagedPanel } from "../../../../../../components/paged";
import { PageIntro, Screen } from "../../../../../../components/screen";
import { SearchField } from "../../../../../../components/search-field";
import { Text } from "../../../../../../components/text";
import { WebButton } from "../../../../../../components/web-button";
import { formatAgo } from "../../../../../../lib/format";
import { useSuppressions } from "../../../../../../lib/queries";
import { type EnvironmentParams, environmentPath } from "../../../../../../lib/web";

// apps/web/src/components/email-badges.tsx (SuppressionReasonBadge).
const REASON_VARIANT = {
  bounce: "error",
  complaint: "error",
  manual: "secondary",
  import: "secondary",
} as const;

export default function SuppressionsScreen() {
  const params = useLocalSearchParams<EnvironmentParams>();
  const [address, setAddress] = useState("");
  const query = useSuppressions(params, address);
  const items = query.data?.pages.flatMap((page) => page.data) ?? [];
  return (
    <Screen
      onRefresh={() => void query.refetch()}
      refreshing={query.isRefetching && !query.isFetchingNextPage}
      title="Suppressions"
    >
      <Stack.Screen
        options={{
          headerRight: () => <WebButton path={`${environmentPath(params)}/suppressions`} />,
        }}
      />
      <PageIntro
        description="Emails from this environment skip these addresses. Permanent bounces and complaints are added automatically; entries for a category only apply to emails sent with that category."
        meta={<ModeBadge params={params} />}
        title="Suppressions"
      />
      <SearchField
        keyboardType="email-address"
        onSubmit={setAddress}
        placeholder="ann@example.com"
        value={address}
      />
      <PagedPanel
        empty={
          address
            ? {
                icon: Ban,
                title: "Not suppressed",
                description: `${address} isn't on this environment's list.`,
              }
            : {
                icon: Ban,
                title: "No suppressions",
                description: "Addresses that bounce or complain are added here.",
              }
        }
        items={items}
        query={query}
        render={(entry) => (
          <View key={entry.id} style={styles.row}>
            <View style={styles.text}>
              <Text numberOfLines={1} selectable variant="label">
                {entry.address}
              </Text>
              <View style={styles.badges}>
                {entry.scope === "*" ? (
                  <Badge variant="outline">All emails</Badge>
                ) : (
                  <Badge mono variant="secondary">
                    {entry.scope}
                  </Badge>
                )}
                <Badge variant={REASON_VARIANT[entry.reason]}>{entry.reason}</Badge>
              </View>
            </View>
            <Text muted variant="mono">
              {formatAgo(entry.created_at)}
            </Text>
          </View>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "flex-start", gap: 12, padding: 16 },
  text: { flex: 1, gap: 6 },
  badges: { flexDirection: "row", gap: 6 },
});
