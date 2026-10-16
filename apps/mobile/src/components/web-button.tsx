import { ExternalLink } from "lucide-react-native";
import { Pressable } from "react-native";
import { openOnWeb } from "../lib/web";
import { Icon } from "./icon";

/** A header button that opens the same page on coss.com. */
export function WebButton({ path }: { path: string }) {
  return (
    <Pressable accessibilityLabel="Open on coss.com" hitSlop={10} onPress={() => openOnWeb(path)}>
      <Icon icon={ExternalLink} size={18} />
    </Pressable>
  );
}
