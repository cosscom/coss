import { ScrollView, StyleSheet } from "react-native";
import { colors } from "../lib/theme";
import { Text } from "./text";

/** Mono text (JSON, headers) that scrolls sideways instead of wrapping. */
export function CodeBlock({ children }: { children: string }) {
  return (
    <ScrollView contentContainerStyle={styles.content} horizontal style={styles.block}>
      <Text selectable style={styles.text} variant="mono">
        {children}
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  block: { backgroundColor: colors.muted },
  content: { padding: 16 },
  text: { lineHeight: 18 },
});
