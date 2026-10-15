import { Stack, useLocalSearchParams } from "expo-router";
import { KeyRound } from "lucide-react-native";
import { StyleSheet, View } from "react-native";
import { EmptyState } from "../../../../../../components/empty";
import { Icon } from "../../../../../../components/icon";
import { ModeBadge } from "../../../../../../components/mode-badge";
import { Panel, Ruled } from "../../../../../../components/panel";
import { ErrorState, Loading, PageIntro, Screen } from "../../../../../../components/screen";
import { Text } from "../../../../../../components/text";
import { WebButton } from "../../../../../../components/web-button";
import { formatAgo, formatDateTime } from "../../../../../../lib/format";
import { useApiKeys, useEnvironment } from "../../../../../../lib/queries";
import { type EnvironmentParams, environmentPath } from "../../../../../../lib/web";

export default function ApiKeysScreen() {
  const params = useLocalSearchParams<EnvironmentParams>();
  const query = useApiKeys(params);
  const environment = useEnvironment(params).data;
  if (query.isPending) return <Loading />;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => query.refetch()} />;
  const where = environment
    ? `${environment.project.name} · ${environment.environment.name}`
    : "this environment";
  return (
    <Screen onRefresh={() => query.refetch()} refreshing={query.isRefetching} title="API keys">
      <Stack.Screen
        options={{ headerRight: () => <WebButton path={`${environmentPath(params)}/api-keys`} /> }}
      />
      <PageIntro
        description={`Keys authenticate requests to the API and SDK. They start with ${query.data.prefix} and only work in ${where}. Create and revoke keys on coss.com.`}
        meta={<ModeBadge params={params} />}
        title="API keys"
      />
      <Panel>
        {query.data.data.length === 0 ? (
          <EmptyState
            description="Create a key, then send with it from your server as COSS_API_KEY."
            icon={KeyRound}
            title="No API keys yet"
          />
        ) : (
          <Ruled>
            {query.data.data.map((key) => (
              <View key={key.id} style={styles.row}>
                <Icon color="mutedForeground" icon={KeyRound} size={18} />
                <View style={styles.text}>
                  <Text numberOfLines={1} variant="label">
                    {key.name ?? "Untitled"}
                  </Text>
                  <Text muted variant="mono">
                    {key.start ? `${key.start}…` : "—"}
                  </Text>
                  <Text muted variant="small">
                    Created {formatDateTime(key.created_at).split(",")[0]} · last used{" "}
                    {key.last_used_at ? formatAgo(key.last_used_at) : "never"}
                  </Text>
                </View>
              </View>
            ))}
          </Ruled>
        )}
      </Panel>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "flex-start", gap: 12, padding: 16 },
  text: { flex: 1, gap: 2 },
});
