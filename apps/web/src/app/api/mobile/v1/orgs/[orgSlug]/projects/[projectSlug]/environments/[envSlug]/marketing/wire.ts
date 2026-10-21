import type { MarketingSettings } from "@coss/companion";
import type { MarketingSettingsRow } from "@coss/email";

// The fields of the dashboard's marketing/settings-form.tsx (`null`: never saved).
export function toMarketingSettings(row: MarketingSettingsRow | null): MarketingSettings {
  return {
    display_name: row?.displayName ?? null,
    mailing_address: row?.mailingAddress ?? null,
    double_opt_in_default: row?.doubleOptInDefault ?? false,
    confirmation_from: row?.confirmationFrom ?? null,
    confirmation_subject: row?.confirmationSubject ?? null,
    confirmation_html: row?.confirmationHtml ?? null,
    confirmed_redirect_url: row?.confirmedRedirectUrl ?? null,
  };
}
