using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(EmailRecipientStatus.EmailRecipientStatusSerializer))]
[Serializable]
public readonly record struct EmailRecipientStatus : IStringEnum
{
    public static readonly EmailRecipientStatus Queued = new(Values.Queued);

    public static readonly EmailRecipientStatus Sent = new(Values.Sent);

    public static readonly EmailRecipientStatus DeliveryDelayed = new(Values.DeliveryDelayed);

    public static readonly EmailRecipientStatus Delivered = new(Values.Delivered);

    public static readonly EmailRecipientStatus Bounced = new(Values.Bounced);

    public static readonly EmailRecipientStatus Suppressed = new(Values.Suppressed);

    public static readonly EmailRecipientStatus Complained = new(Values.Complained);

    public static readonly EmailRecipientStatus Failed = new(Values.Failed);

    public static readonly EmailRecipientStatus Canceled = new(Values.Canceled);

    public EmailRecipientStatus(string value)
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
    public static EmailRecipientStatus FromCustom(string value)
    {
        return new EmailRecipientStatus(value);
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

    public static bool operator ==(EmailRecipientStatus value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(EmailRecipientStatus value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(EmailRecipientStatus value) => value.Value;

    public static explicit operator EmailRecipientStatus(string value) => new(value);

    internal class EmailRecipientStatusSerializer : JsonConverter<EmailRecipientStatus>
    {
        public override EmailRecipientStatus Read(
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
            return new EmailRecipientStatus(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            EmailRecipientStatus value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override EmailRecipientStatus ReadAsPropertyName(
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
            return new EmailRecipientStatus(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            EmailRecipientStatus value,
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
        public const string Queued = "queued";

        public const string Sent = "sent";

        public const string DeliveryDelayed = "delivery_delayed";

        public const string Delivered = "delivered";

        public const string Bounced = "bounced";

        public const string Suppressed = "suppressed";

        public const string Complained = "complained";

        public const string Failed = "failed";

        public const string Canceled = "canceled";
    }
}
