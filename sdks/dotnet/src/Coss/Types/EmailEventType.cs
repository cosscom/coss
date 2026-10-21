using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(EmailEventType.EmailEventTypeSerializer))]
[Serializable]
public readonly record struct EmailEventType : IStringEnum
{
    public static readonly EmailEventType EmailSent = new(Values.EmailSent);

    public static readonly EmailEventType EmailDelivered = new(Values.EmailDelivered);

    public static readonly EmailEventType EmailDeliveryDelayed = new(Values.EmailDeliveryDelayed);

    public static readonly EmailEventType EmailBounced = new(Values.EmailBounced);

    public static readonly EmailEventType EmailComplained = new(Values.EmailComplained);

    public static readonly EmailEventType EmailFailed = new(Values.EmailFailed);

    public static readonly EmailEventType EmailSuppressed = new(Values.EmailSuppressed);

    public static readonly EmailEventType EmailScheduled = new(Values.EmailScheduled);

    public static readonly EmailEventType EmailCanceled = new(Values.EmailCanceled);

    public static readonly EmailEventType EmailOpened = new(Values.EmailOpened);

    public static readonly EmailEventType EmailClicked = new(Values.EmailClicked);

    public static readonly EmailEventType EmailRescheduled = new(Values.EmailRescheduled);

    public static readonly EmailEventType EmailUnsubscribed = new(Values.EmailUnsubscribed);

    public EmailEventType(string value)
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
    public static EmailEventType FromCustom(string value)
    {
        return new EmailEventType(value);
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

    public static bool operator ==(EmailEventType value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(EmailEventType value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(EmailEventType value) => value.Value;

    public static explicit operator EmailEventType(string value) => new(value);

    internal class EmailEventTypeSerializer : JsonConverter<EmailEventType>
    {
        public override EmailEventType Read(
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
            return new EmailEventType(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            EmailEventType value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override EmailEventType ReadAsPropertyName(
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
            return new EmailEventType(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            EmailEventType value,
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
