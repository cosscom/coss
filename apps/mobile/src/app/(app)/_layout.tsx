import { Stack } from "expo-router";
import { fonts, usePalette } from "../../lib/theme";

export const unstable_settings = { anchor: "index" };

export default function AppLayout() {
  const palette = usePalette();
  return (
    <Stack
      screenOptions={{
        // Pages draw their own title (`Screen` + `PageIntro`); the bar shows it once it scrolls away.
        title: "",
        headerShadowVisible: false,
        headerBackButtonDisplayMode: "minimal",
        headerTintColor: palette.foreground,
        headerStyle: { backgroundColor: palette.background },
        headerTitleStyle: { fontFamily: fonts.semibold, fontSize: 17, color: palette.foreground },
        contentStyle: { backgroundColor: palette.background },
      }}
    >
      <Stack.Screen name="settings" options={{ title: "Account", presentation: "modal" }} />
      <Stack.Screen
        name="delete-account"
        options={{ title: "Delete account", presentation: "modal" }}
      />
      <Stack.Screen
        name="[org]/projects/[project]/[env]/emails/[id]"
        options={{ title: "Email" }}
      />
    </Stack>
  );
}
