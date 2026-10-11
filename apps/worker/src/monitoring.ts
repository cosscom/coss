import { EmailError, type EmailService } from "@coss/email";
import { EMAIL_DISPATCH_QUEUE } from "@coss/email/dispatch";
import * as Sentry from "@sentry/bun";

/**
 * Wraps `dispatch` for the pg-boss handler: each job is its own trace and transaction
 * (`email.dispatch`), tagged with its organization and email, and a failure pg-boss will retry is
 * reported before it is rethrown. A no-op without Sentry.
 */
export function monitoredDispatch(
  service: Pick<EmailService, "dispatch">,
): Pick<EmailService, "dispatch"> {
  return {
    dispatch: (input) =>
      Sentry.withIsolationScope((scope) => {
        scope.setTags({
          queue: EMAIL_DISPATCH_QUEUE,
          organization_id: input.organizationId,
          email_id: input.emailId,
        });
        return Sentry.startNewTrace(() =>
          Sentry.startSpan(
            { name: "email.dispatch", op: "queue.process", forceTransaction: true },
            async () => {
              try {
                return await service.dispatch(input);
              } catch (error) {
                // Deleted emails are expected (runDispatchJob drops them).
                if (!(error instanceof EmailError && error.code === "not_found")) {
                  Sentry.captureException(error);
                }
                throw error;
              }
            },
          ),
        );
      }),
  };
}
