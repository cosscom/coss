import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as Notifications from "expo-notifications";
import { type Href, router, Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { View } from "react-native";
import { AuthProvider, useAuth } from "../lib/auth";
import { routeFromNotification } from "../lib/push-route";
import { colors } from "../lib/theme";

export default function RootLayout() {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider queryClient={queryClient}>
        <StatusBar style="auto" />
        <RootStack />
      </AuthProvider>
    </QueryClientProvider>
  );
}

function RootStack() {
  const { status } = useAuth();
  useNotificationTaps(status === "signed_in");
  if (status === "loading") return <View style={{ flex: 1, backgroundColor: colors.background }} />;
  return (
    <Stack
      screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}
    >
      <Stack.Protected guard={status === "signed_in"}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
      <Stack.Protected guard={status === "signed_out"}>
        <Stack.Screen name="sign-in" />
      </Stack.Protected>
    </Stack>
  );
}

/** Opens the page a tapped notification points at, including the one that launched the app. */
function useNotificationTaps(signedIn: boolean) {
  const response = Notifications.useLastNotificationResponse();
  useEffect(() => {
    if (!signedIn || !response) return;
    if (response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;
    Notifications.clearLastNotificationResponse();
    const path = routeFromNotification(response.notification.request.content.data);
    if (path) router.push(path as Href);
  }, [signedIn, response]);
}
