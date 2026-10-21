using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(
    typeof(SmsWebhookEventDataSuppressionReason.SmsWebhookEventDataSuppressionReasonSerializer)
)]
[Serializable]
public readonly record struct SmsWebhookEventDataSuppressionReason : IStringEnum
{
    public static readonly SmsWebhookEventDataSuppressionReason OptOut = new(Values.OptOut);

    public static readonly SmsWebhookEventDataSuppressionReason Manual = new(Values.Manual);

    public static readonly SmsWebhookEventDataSuppressionReason InvalidNumber = new(
        Values.InvalidNumber
    );

    public SmsWebhookEventDataSuppressionReason(string value)
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
    public static SmsWebhookEventDataSuppressionReason FromCustom(string value)
    {
        return new SmsWebhookEventDataSuppressionReason(value);
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

    public static bool operator ==(SmsWebhookEventDataSuppressionReason value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(SmsWebhookEventDataSuppressionReason value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(SmsWebhookEventDataSuppressionReason value) =>
        value.Value;

    public static explicit operator SmsWebhookEventDataSuppressionReason(string value) =>
        new(value);

    internal class SmsWebhookEventDataSuppressionReasonSerializer
        : JsonConverter<SmsWebhookEventDataSuppressionReason>
    {
        public override SmsWebhookEventDataSuppressionReason Read(
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
            return new SmsWebhookEventDataSuppressionReason(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            SmsWebhookEventDataSuppressionReason value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override SmsWebhookEventDataSuppressionReason ReadAsPropertyName(
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
            return new SmsWebhookEventDataSuppressionReason(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            SmsWebhookEventDataSuppressionReason value,
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
        public const string OptOut = "opt_out";

        public const string Manual = "manual";

        public const string InvalidNumber = "invalid_number";
    }
}
