import { useNavigation } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { CloudOff, Fingerprint, KeyRound, TriangleAlert } from "lucide-react-native";
import { type ReactNode, useLayoutEffect, useState } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { useAuth } from "../lib/auth";
import { DASHBOARD_URL } from "../lib/config";
import { ApiRequestError } from "../lib/queries";
import { colors, usePalette } from "../lib/theme";
import { Button } from "./button";
import { EmptyState } from "./empty";
import { Text } from "./text";

/** Past this offset the page title has scrolled under the bar, which then shows it. */
const TITLE_SCROLLED = 44;

export function Screen(props: {
  children: ReactNode;
  /** The page title, shown in the navigation bar once the in-page title scrolls away. */
  title?: string;
  /** Pull to refresh; the spinner shows until the returned promise settles. */
  onRefresh?: () => unknown;
}) {
  const palette = usePalette();
  const navigation = useNavigation();
  const [scrolled, setScrolled] = useState(false);
  // Only a pull shows the spinner: background refetches (revisits, invalidations) stay silent.
  const [refreshing, setRefreshing] = useState(false);
  const { title, onRefresh } = props;
  useLayoutEffect(() => {
    if (title === undefined) return;
    navigation.setOptions({ title: scrolled ? title : "", headerShadowVisible: scrolled });
  }, [navigation, title, scrolled]);
  return (
    <ScrollView
      contentContainerStyle={styles.content}
      automaticallyAdjustKeyboardInsets
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      onScroll={(event) => setScrolled(event.nativeEvent.contentOffset.y > TITLE_SCROLLED)}
      scrollEventThrottle={32}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            onRefresh={() => {
              setRefreshing(true);
              void Promise.resolve(onRefresh())
                .catch(() => {})
                .finally(() => setRefreshing(false));
            }}
            refreshing={refreshing}
            tintColor={palette.mutedForeground}
          />
        ) : undefined
      }
      style={styles.screen}
    >
      {props.children}
    </ScrollView>
  );
}

/** The dashboard's `PageHeader`: the title in the display face, a description and a meta line. */
export function PageIntro(props: {
  title?: string;
  /** The title in mono (a URL, an id), like the dashboard's endpoint pages. */
  mono?: boolean;
  description?: ReactNode;
  meta?: ReactNode;
}) {
  return (
    <View style={styles.intro}>
      {props.title ? (
        <Text
          selectable
          style={props.mono && styles.monoTitle}
          variant={props.mono ? "mono" : "title"}
        >
          {props.title}
        </Text>
      ) : null}
      {props.description ? (
        <Text muted variant="body">
          {props.description}
        </Text>
      ) : null}
      {props.meta ? <View style={styles.meta}>{props.meta}</View> : null}
    </View>
  );
}

export function Loading() {
  const palette = usePalette();
  return (
    <View style={[styles.screen, styles.centered]}>
      <ActivityIndicator color={palette.mutedForeground} />
    </View>
  );
}

/** A failed query, with the way out of an organization's SSO or two-factor requirement. */
export function ErrorState({ error, onRetry }: { error: Error; onRetry: () => void }) {
  const { signOut } = useAuth();
  const apiError = error instanceof ApiRequestError ? error.error : null;
  const url = apiError?.url;
  const view =
    apiError?.code === "two_factor_required" && url
      ? {
          icon: Fingerprint,
          title: "Two-factor authentication required",
          action: (
            <Button
              onPress={() => void WebBrowser.openBrowserAsync(`${DASHBOARD_URL}${url}`)}
              title="Set it up on coss.com"
              variant="outline"
            />
          ),
        }
      : apiError?.code === "sso_required"
        ? {
            icon: KeyRound,
            title: "Single sign-on required",
            action: (
              <Button
                onPress={() => void signOut()}
                title="Sign in again with SSO"
                variant="outline"
              />
            ),
          }
        : {
            icon: apiError?.code === "network_error" ? CloudOff : TriangleAlert,
            title: apiError?.code === "network_error" ? "You're offline" : "Couldn't load this",
            action: <Button onPress={onRetry} size="sm" title="Try again" variant="outline" />,
          };
  return (
    <Screen>
      <EmptyState
        action={view.action}
        description={error.message}
        icon={view.icon}
        title={view.title}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 56, gap: 20 },
  centered: { alignItems: "center", justifyContent: "center" },
  intro: { gap: 8 },
  monoTitle: { fontSize: 19, lineHeight: 26 },
  meta: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8 },
});
