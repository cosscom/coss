import type { Registry } from "shadcn/schema";
import { atoms } from "@/registry/registry-atoms";
import { baseUi } from "@/registry/registry-base-ui";
import { cal } from "@/registry/registry-cal";
import { fonts } from "@/registry/registry-fonts";
import { hooks } from "@/registry/registry-hooks";
import { lib } from "@/registry/registry-lib";
import { particles } from "@/registry/registry-particles";
import { styles } from "@/registry/registry-styles";
import { ui } from "@/registry/registry-ui";

export const registry = {
  homepage: "https://coss.com",
  items: [
    ...ui,
    ...(particles as Registry["items"]),
    ...(atoms as Registry["items"]),
    ...styles,
    ...fonts,
    ...lib,
    ...cal,
    ...baseUi,
    ...hooks,
  ],
  name: "coss ui",
} satisfies Registry;
