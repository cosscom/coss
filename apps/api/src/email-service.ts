import {
  createEmailService,
  type EmailProvider,
  type EmailService,
  FakeEmailProvider,
} from "@coss/email";

/** Values of `EMAIL_PROVIDER`: the provider used by live (production) environments. */
export const EMAIL_PROVIDERS = ["fake"] as const;

export type EmailProviderName = (typeof EMAIL_PROVIDERS)[number];

/** Adding a provider (e.g. "ses") means a new `EMAIL_PROVIDERS` entry and a case here. */
export function createLiveEmailProvider(name: EmailProviderName): EmailProvider {
  switch (name) {
    case "fake":
      return new FakeEmailProvider();
  }
}

/** Sandbox environments always use the fake provider, whatever live environments use. */
export function createDefaultEmailService(provider: EmailProviderName = "fake"): EmailService {
  return createEmailService({
    liveProvider: createLiveEmailProvider(provider),
    sandboxProvider: new FakeEmailProvider(),
  });
}
