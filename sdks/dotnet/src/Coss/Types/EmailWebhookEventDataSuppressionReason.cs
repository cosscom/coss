using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(
    typeof(EmailWebhookEventDataSuppressionReason.EmailWebhookEventDataSuppressionReasonSerializer)
)]
[Serializable]
public readonly record struct EmailWebhookEventDataSuppressionReason : IStringEnum
{
    public static readonly EmailWebhookEventDataSuppressionReason Bounce = new(Values.Bounce);

    public static readonly EmailWebhookEventDataSuppressionReason Complaint = new(Values.Complaint);

    public static readonly EmailWebhookEventDataSuppressionReason Manual = new(Values.Manual);

    public static readonly EmailWebhookEventDataSuppressionReason Import = new(Values.Import);

    public static readonly EmailWebhookEventDataSuppressionReason Unsubscribe = new(
        Values.Unsubscribe
    );

    public EmailWebhookEventDataSuppressionReason(string value)
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
    public static EmailWebhookEventDataSuppressionReason FromCustom(string value)
    {
        return new EmailWebhookEventDataSuppressionReason(value);
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

    public static bool operator ==(EmailWebhookEventDataSuppressionReason value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(EmailWebhookEventDataSuppressionReason value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(EmailWebhookEventDataSuppressionReason value) =>
        value.Value;

    public static explicit operator EmailWebhookEventDataSuppressionReason(string value) =>
        new(value);

    internal class EmailWebhookEventDataSuppressionReasonSerializer
        : JsonConverter<EmailWebhookEventDataSuppressionReason>
    {
        public override EmailWebhookEventDataSuppressionReason Read(
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
            return new EmailWebhookEventDataSuppressionReason(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            EmailWebhookEventDataSuppressionReason value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override EmailWebhookEventDataSuppressionReason ReadAsPropertyName(
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
            return new EmailWebhookEventDataSuppressionReason(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            EmailWebhookEventDataSuppressionReason value,
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
        public const string Bounce = "bounce";

        public const string Complaint = "complaint";

        public const string Manual = "manual";

        public const string Import = "import";

        public const string Unsubscribe = "unsubscribe";
    }
}
