using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(EmailWebhookEventType.EmailWebhookEventTypeSerializer))]
[Serializable]
public readonly record struct EmailWebhookEventType : IStringEnum
{
    public static readonly EmailWebhookEventType EmailSent = new(Values.EmailSent);

    public static readonly EmailWebhookEventType EmailDelivered = new(Values.EmailDelivered);

    public static readonly EmailWebhookEventType EmailDeliveryDelayed = new(
        Values.EmailDeliveryDelayed
    );

    public static readonly EmailWebhookEventType EmailBounced = new(Values.EmailBounced);

    public static readonly EmailWebhookEventType EmailComplained = new(Values.EmailComplained);

    public static readonly EmailWebhookEventType EmailFailed = new(Values.EmailFailed);

    public static readonly EmailWebhookEventType EmailSuppressed = new(Values.EmailSuppressed);

    public static readonly EmailWebhookEventType EmailScheduled = new(Values.EmailScheduled);

    public static readonly EmailWebhookEventType EmailCanceled = new(Values.EmailCanceled);

    public static readonly EmailWebhookEventType EmailOpened = new(Values.EmailOpened);

    public static readonly EmailWebhookEventType EmailClicked = new(Values.EmailClicked);

    public static readonly EmailWebhookEventType EmailRescheduled = new(Values.EmailRescheduled);

    public static readonly EmailWebhookEventType EmailUnsubscribed = new(Values.EmailUnsubscribed);

    public EmailWebhookEventType(string value)
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
    public static EmailWebhookEventType FromCustom(string value)
    {
        return new EmailWebhookEventType(value);
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

    public static bool operator ==(EmailWebhookEventType value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(EmailWebhookEventType value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(EmailWebhookEventType value) => value.Value;

    public static explicit operator EmailWebhookEventType(string value) => new(value);

    internal class EmailWebhookEventTypeSerializer : JsonConverter<EmailWebhookEventType>
    {
        public override EmailWebhookEventType Read(
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
            return new EmailWebhookEventType(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            EmailWebhookEventType value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override EmailWebhookEventType ReadAsPropertyName(
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
            return new EmailWebhookEventType(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            EmailWebhookEventType value,
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
    }
}
