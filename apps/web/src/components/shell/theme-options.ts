import { MonitorIcon, MoonIcon, SunIcon } from "lucide-react";

/** The choices of the theme menus (user menu, ⌘K); `system` follows the OS. */
export const THEME_OPTIONS = [
  { value: "system", label: "System", icon: MonitorIcon },
  { value: "light", label: "Light", icon: SunIcon },
  { value: "dark", label: "Dark", icon: MoonIcon },
] as const;
