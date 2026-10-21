import type { HookPortalSettingsResponse } from "@coss/companion";
import type { PortalSettings } from "@coss/hooks";

/** The environment's Hooks portal settings, as the app's Portal settings screen shows them. */
export function toMobileHookPortalSettings(settings: PortalSettings): HookPortalSettingsResponse {
  return {
    allowed_origins: settings.allowedOrigins,
    display_name: settings.displayName,
    accent_color: settings.accentColor,
    theme: settings.theme,
  };
}
