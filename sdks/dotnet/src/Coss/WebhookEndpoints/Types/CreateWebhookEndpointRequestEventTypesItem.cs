using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(
    typeof(CreateWebhookEndpointRequestEventTypesItem.CreateWebhookEndpointRequestEventTypesItemSerializer)
)]
[Serializable]
public readonly record struct CreateWebhookEndpointRequestEventTypesItem : IStringEnum
{
    public static readonly CreateWebhookEndpointRequestEventTypesItem EmailSent = new(
        Values.EmailSent
    );

    public static readonly CreateWebhookEndpointRequestEventTypesItem EmailDelivered = new(
        Values.EmailDelivered
    );

    public static readonly CreateWebhookEndpointRequestEventTypesItem EmailDeliveryDelayed = new(
        Values.EmailDeliveryDelayed
    );

    public static readonly CreateWebhookEndpointRequestEventTypesItem EmailBounced = new(
        Values.EmailBounced
    );

    public static readonly CreateWebhookEndpointRequestEventTypesItem EmailComplained = new(
        Values.EmailComplained
    );

    public static readonly CreateWebhookEndpointRequestEventTypesItem EmailFailed = new(
        Values.EmailFailed
    );

    public static readonly CreateWebhookEndpointRequestEventTypesItem EmailSuppressed = new(
        Values.EmailSuppressed
    );

    public static readonly CreateWebhookEndpointRequestEventTypesItem EmailScheduled = new(
        Values.EmailScheduled
    );

    public static readonly CreateWebhookEndpointRequestEventTypesItem EmailCanceled = new(
        Values.EmailCanceled
    );

    public static readonly CreateWebhookEndpointRequestEventTypesItem EmailOpened = new(
        Values.EmailOpened
    );

    public static readonly CreateWebhookEndpointRequestEventTypesItem EmailClicked = new(
        Values.EmailClicked
    );

    public static readonly CreateWebhookEndpointRequestEventTypesItem EmailRescheduled = new(
        Values.EmailRescheduled
    );

    public static readonly CreateWebhookEndpointRequestEventTypesItem EmailUnsubscribed = new(
        Values.EmailUnsubscribed
    );

    public static readonly CreateWebhookEndpointRequestEventTypesItem EmailReceived = new(
        Values.EmailReceived
    );

    public static readonly CreateWebhookEndpointRequestEventTypesItem DomainDmarcReportReceived =
        new(Values.DomainDmarcReportReceived);

    public static readonly CreateWebhookEndpointRequestEventTypesItem AccountReputationWarning =
        new(Values.AccountReputationWarning);

    public static readonly CreateWebhookEndpointRequestEventTypesItem AccountReputationRecovered =
        new(Values.AccountReputationRecovered);

    public static readonly CreateWebhookEndpointRequestEventTypesItem AccountSuspended = new(
        Values.AccountSuspended
    );

    public static readonly CreateWebhookEndpointRequestEventTypesItem AccountReinstated = new(
        Values.AccountReinstated
    );

    public static readonly CreateWebhookEndpointRequestEventTypesItem AccountMarketingPaused = new(
        Values.AccountMarketingPaused
    );

    public static readonly CreateWebhookEndpointRequestEventTypesItem AccountMarketingReinstated =
        new(Values.AccountMarketingReinstated);

    public static readonly CreateWebhookEndpointRequestEventTypesItem HookEndpointDisabled = new(
        Values.HookEndpointDisabled
    );

    public static readonly CreateWebhookEndpointRequestEventTypesItem BillingInvoiceFinalized = new(
        Values.BillingInvoiceFinalized
    );

    public static readonly CreateWebhookEndpointRequestEventTypesItem BillingInvoicePaid = new(
        Values.BillingInvoicePaid
    );

    public static readonly CreateWebhookEndpointRequestEventTypesItem BillingInvoicePaymentFailed =
        new(Values.BillingInvoicePaymentFailed);

    public static readonly CreateWebhookEndpointRequestEventTypesItem BillingInvoiceVoided = new(
        Values.BillingInvoiceVoided
    );

    public static readonly CreateWebhookEndpointRequestEventTypesItem BillingPlanChanged = new(
        Values.BillingPlanChanged
    );

    public static readonly CreateWebhookEndpointRequestEventTypesItem BillingUsageThresholdReached =
        new(Values.BillingUsageThresholdReached);

    public static readonly CreateWebhookEndpointRequestEventTypesItem BillingHoldPlaced = new(
        Values.BillingHoldPlaced
    );

    public static readonly CreateWebhookEndpointRequestEventTypesItem BillingHoldLifted = new(
        Values.BillingHoldLifted
    );

    public static readonly CreateWebhookEndpointRequestEventTypesItem BillingCreditGranted = new(
        Values.BillingCreditGranted
    );

    public static readonly CreateWebhookEndpointRequestEventTypesItem RiskAssessmentReview = new(
        Values.RiskAssessmentReview
    );

    public static readonly CreateWebhookEndpointRequestEventTypesItem RiskAssessmentReviewed = new(
        Values.RiskAssessmentReviewed
    );

    public static readonly CreateWebhookEndpointRequestEventTypesItem ContactCreated = new(
        Values.ContactCreated
    );

    public static readonly CreateWebhookEndpointRequestEventTypesItem ContactUpdated = new(
        Values.ContactUpdated
    );

    public static readonly CreateWebhookEndpointRequestEventTypesItem ContactDeleted = new(
        Values.ContactDeleted
    );

    public static readonly CreateWebhookEndpointRequestEventTypesItem ContactUnsubscribed = new(
        Values.ContactUnsubscribed
    );

    public static readonly CreateWebhookEndpointRequestEventTypesItem ContactConfirmed = new(
        Values.ContactConfirmed
    );

    public static readonly CreateWebhookEndpointRequestEventTypesItem BroadcastSending = new(
        Values.BroadcastSending
    );

    public static readonly CreateWebhookEndpointRequestEventTypesItem BroadcastSent = new(
        Values.BroadcastSent
    );

    public static readonly CreateWebhookEndpointRequestEventTypesItem BroadcastPaused = new(
        Values.BroadcastPaused
    );

    public static readonly CreateWebhookEndpointRequestEventTypesItem BroadcastCanceled = new(
        Values.BroadcastCanceled
    );

    public static readonly CreateWebhookEndpointRequestEventTypesItem BroadcastFailed = new(
        Values.BroadcastFailed
    );

    public CreateWebhookEndpointRequestEventTypesItem(string value)
    {
        Value = value;
    }

    /// <summary>
    /// The string value of the enum.
    /// </summary>
    public string Value { get; }

    /// <summary>
    /// Create a string enum with the given value.
    /// </summary>
    public static CreateWebhookEndpointRequestEventTypesItem FromCustom(string value)
    {
        return new CreateWebhookEndpointRequestEventTypesItem(value);
    }

    public bool Equals(string? other)
    {
        return Value.Equals(other);
    }

    /// <summary>
    /// Returns the string value of the enum.
    /// </summary>
    public override string ToString()
    {
        return Value;
    }

    public static bool operator ==(
        CreateWebhookEndpointRequestEventTypesItem value1,
        string value2
    ) => value1.Value.Equals(value2);

    public static bool operator !=(
        CreateWebhookEndpointRequestEventTypesItem value1,
        string value2
    ) => !value1.Value.Equals(value2);

    public static explicit operator string(CreateWebhookEndpointRequestEventTypesItem value) =>
        value.Value;

    public static explicit operator CreateWebhookEndpointRequestEventTypesItem(string value) =>
        new(value);

    internal class CreateWebhookEndpointRequestEventTypesItemSerializer
        : JsonConverter<CreateWebhookEndpointRequestEventTypesItem>
    {
        public override CreateWebhookEndpointRequestEventTypesItem Read(
            ref Utf8JsonReader reader,
            Type typeToConvert,
            JsonSerializerOptions options
        )
        {
            var stringValue =
                reader.GetString()
                ?? throw new global::System.Exception(
                    "The JSON value could not be read as a string."
                );
            return new CreateWebhookEndpointRequestEventTypesItem(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            CreateWebhookEndpointRequestEventTypesItem value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override CreateWebhookEndpointRequestEventTypesItem ReadAsPropertyName(
            ref Utf8JsonReader reader,
            Type typeToConvert,
            JsonSerializerOptions options
        )
        {
            var stringValue =
                reader.GetString()
                ?? throw new global::System.Exception(
                    "The JSON property name could not be read as a string."
                );
            return new CreateWebhookEndpointRequestEventTypesItem(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            CreateWebhookEndpointRequestEventTypesItem value,
            JsonSerializerOptions options
        )
        {
            writer.WritePropertyName(value.Value);
        }
    }

    /// <summary>
    /// Constant strings for enum values
    /// </summary>
    [Serializable]
    public static class Values
    {
        public const string EmailSent = "email.sent";

        public const string EmailDelivered = "email.delivered";

        public const string EmailDeliveryDelayed = "email.delivery_delayed";

        public const string EmailBounced = "email.bounced";

        public const string EmailComplained = "email.complained";

        public const string EmailFailed = "email.failed";

        public const string EmailSuppressed = "email.suppressed";

        public const string EmailScheduled = "email.scheduled";

        public const string EmailCanceled = "email.canceled";

        public const string EmailOpened = "email.opened";

        public const string EmailClicked = "email.clicked";

        public const string EmailRescheduled = "email.rescheduled";

        public const string EmailUnsubscribed = "email.unsubscribed";

        public const string EmailReceived = "email.received";

        public const string DomainDmarcReportReceived = "domain.dmarc_report_received";

        public const string AccountReputationWarning = "account.reputation_warning";

        public const string AccountReputationRecovered = "account.reputation_recovered";

        public const string AccountSuspended = "account.suspended";

        public const string AccountReinstated = "account.reinstated";

        public const string AccountMarketingPaused = "account.marketing_paused";

        public const string AccountMarketingReinstated = "account.marketing_reinstated";

        public const string HookEndpointDisabled = "hook_endpoint.disabled";

        public const string BillingInvoiceFinalized = "billing.invoice_finalized";

        public const string BillingInvoicePaid = "billing.invoice_paid";

        public const string BillingInvoicePaymentFailed = "billing.invoice_payment_failed";

        public const string BillingInvoiceVoided = "billing.invoice_voided";

        public const string BillingPlanChanged = "billing.plan_changed";

        public const string BillingUsageThresholdReached = "billing.usage_threshold_reached";

        public const string BillingHoldPlaced = "billing.hold_placed";

        public const string BillingHoldLifted = "billing.hold_lifted";

        public const string BillingCreditGranted = "billing.credit_granted";

        public const string RiskAssessmentReview = "risk.assessment.review";

        public const string RiskAssessmentReviewed = "risk.assessment.reviewed";

        public const string ContactCreated = "contact.created";

        public const string ContactUpdated = "contact.updated";

        public const string ContactDeleted = "contact.deleted";

        public const string ContactUnsubscribed = "contact.unsubscribed";

        public const string ContactConfirmed = "contact.confirmed";

        public const string BroadcastSending = "broadcast.sending";

        public const string BroadcastSent = "broadcast.sent";

        public const string BroadcastPaused = "broadcast.paused";

        public const string BroadcastCanceled = "broadcast.canceled";

        public const string BroadcastFailed = "broadcast.failed";
    }
}
