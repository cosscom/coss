import "server-only";
import { authorizeLiveSender } from "@coss/email";
import {
  type FormChecks,
  type FormFileStore,
  type FormLinks,
  hostedPageScreening,
} from "@coss/forms";
import { formsStoreFromEnv } from "@coss/forms/runtime";
import { env } from "@/env";
import { ActionError } from "@/lib/actions";
import { emailRuntime } from "@/lib/email-runtime";
import { riskDeps } from "@/lib/risk";

let store: FormFileStore | null | undefined;

/** Forms' file store (S3, or the fake one outside production); `null`: no uploads. */
export function formsStore(): FormFileStore | null {
  if (store === undefined) store = formsStoreFromEnv(env);
  return store;
}

/** Where forms are served (`FORMS_PUBLIC_URL`); `null` until the forms host is set up. */
export function formsUrl(): string | null {
  return env.FORMS_PUBLIC_URL ?? null;
}

/** The forms host's links; throws (for actions) while it isn't set up. */
export function formLinks(): FormLinks {
  const url = formsUrl();
  if (!url) throw new ActionError("Forms isn't available yet.");
  return { publicUrl: url };
}

/** What saving a form checks: live senders and recipients, and live hosted pages' text. */
export function formChecks(): FormChecks {
  return {
    screenHostedPage: hostedPageScreening(riskDeps()),
    async verifiedAddress({ organizationId, address }) {
      try {
        await authorizeLiveSender({
          organizationId,
          from: address,
          provider: emailRuntime().domainDeps.identity.name,
        });
        return true;
      } catch {
        return false;
      }
    },
  };
}
