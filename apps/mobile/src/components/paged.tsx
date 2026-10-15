import type { LucideIcon } from "lucide-react-native";
import { ArrowDown } from "lucide-react-native";
import type { ReactNode } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { Button } from "./button";
import { EmptyState } from "./empty";
import { Panel, Ruled } from "./panel";

type PagedQuery = {
  isPending: boolean;
  isError: boolean;
  error: Error | null;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => unknown;
};

/** A `Panel` of ruled rows from a cursor-paged query, with the dashboard's "Older" pager. */
export function PagedPanel<T>(props: {
  query: PagedQuery;
  items: T[];
  render: (item: T) => ReactNode;
  empty: { icon: LucideIcon; title: string; description?: string };
  title?: string;
  description?: string;
  meta?: string;
  olderLabel?: string;
}) {
  const { query } = props;
  return (
    <Panel
      description={props.description}
      footer={
        query.hasNextPage ? (
          <Button
            icon={ArrowDown}
            loading={query.isFetchingNextPage}
            onPress={() => void query.fetchNextPage()}
            size="sm"
            title={props.olderLabel ?? "Older"}
            variant="outline"
          />
        ) : undefined
      }
      meta={props.meta}
      title={props.title}
    >
      {query.isPending ? (
        <View style={styles.loading}>
          <ActivityIndicator />
        </View>
      ) : query.isError ? (
        <EmptyState
          description={query.error?.message}
          icon={props.empty.icon}
          title="Couldn't load this"
        />
      ) : props.items.length === 0 ? (
        <EmptyState {...props.empty} />
      ) : (
        <Ruled>{props.items.map(props.render)}</Ruled>
      )}
    </Panel>
  );
}

const styles = StyleSheet.create({ loading: { paddingVertical: 32 } });
