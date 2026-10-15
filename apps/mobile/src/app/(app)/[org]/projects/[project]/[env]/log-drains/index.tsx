import { Stack, useLocalSearchParams } from "expo-router";
import { Cable } from "lucide-react-native";
import { Alert } from "../../../../../../../components/alert";
import { StatusDot } from "../../../../../../../components/badge";
import { EmptyState } from "../../../../../../../components/empty";
import { ModeBadge } from "../../../../../../../components/mode-badge";
import { ListRow, Panel, Ruled } from "../../../../../../../components/panel";
import { ErrorState, Loading, PageIntro, Screen } from "../../../../../../../components/screen";
import { WebButton } from "../../../../../../../components/web-button";
import { useLogDrains } from "../../../../../../../lib/queries";
import { drainStatus, sourcesSummary } from "../../../../../../../lib/status";
import { type EnvironmentParams, environmentPath, openOnWeb } from "../../../../../../../lib/web";

export default function LogDrainsScreen() {
  const params = useLocalSearchParams<EnvironmentParams>();
  const query = useLogDrains(params);
  if (query.isPending) return <Loading />;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => query.refetch()} />;
  const { plan_allows, data } = query.data;
  return (
    <Screen onRefresh={() => query.refetch()} refreshing={query.isRefetching} title="Log drains">
      <Stack.Screen
        options={{
          headerRight: () => <WebButton path={`${environmentPath(params)}/log-drains`} />,
        }}
      />
      <PageIntro
        description="Stream this environment's API requests, email events, webhook attempts and audit events to your own logging stack."
        meta={<ModeBadge params={params} />}
        title="Log drains"
      />
      {plan_allows ? null : (
        <Alert
          action={{
            label: "Compare plans",
            onPress: () => openOnWeb(`/${params.org}/settings/billing/plans`),
          }}
          description="Log drains are part of the Scale plan and above."
          title="Upgrade to stream logs"
          tone="info"
        />
      )}
      <Panel>
        {data.length === 0 ? (
          <EmptyState
            description="Add one to send this environment's logs to an HTTPS endpoint you run, as they are written."
            icon={Cable}
            title="No log drains yet"
          />
        ) : (
          <Ruled>
            {data.map((drain) => {
              const [tone, label] = drainStatus(drain);
              return (
                <ListRow
                  href={{
                    pathname: "/[org]/projects/[project]/[env]/log-drains/[drainId]",
                    params: { ...params, drainId: drain.id },
                  }}
                  key={drain.id}
                  leading={<StatusDot tone={tone} />}
                  subtitle={`${label} · ${sourcesSummary(drain.sources)}`}
                  title={drain.description ?? drain.url}
                />
              );
            })}
          </Ruled>
        )}
      </Panel>
    </Screen>
  );
}
