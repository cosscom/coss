using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(SmsWebhookEventType.SmsWebhookEventTypeSerializer))]
[Serializable]
public readonly record struct SmsWebhookEventType : IStringEnum
{
    public static readonly SmsWebhookEventType SmsScheduled = new(Values.SmsScheduled);

    public static readonly SmsWebhookEventType SmsSent = new(Values.SmsSent);

    public static readonly SmsWebhookEventType SmsDelivered = new(Values.SmsDelivered);

    public static readonly SmsWebhookEventType SmsUndelivered = new(Values.SmsUndelivered);

    public static readonly SmsWebhookEventType SmsFailed = new(Values.SmsFailed);

    public static readonly SmsWebhookEventType SmsSuppressed = new(Values.SmsSuppressed);

    public static readonly SmsWebhookEventType SmsCanceled = new(Values.SmsCanceled);

    public SmsWebhookEventType(string value)
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
    public static SmsWebhookEventType FromCustom(string value)
    {
        return new SmsWebhookEventType(value);
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

    public static bool operator ==(SmsWebhookEventType value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(SmsWebhookEventType value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(SmsWebhookEventType value) => value.Value;

    public static explicit operator SmsWebhookEventType(string value) => new(value);

    internal class SmsWebhookEventTypeSerializer : JsonConverter<SmsWebhookEventType>
    {
        public override SmsWebhookEventType Read(
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
            return new SmsWebhookEventType(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            SmsWebhookEventType value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override SmsWebhookEventType ReadAsPropertyName(
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
            return new SmsWebhookEventType(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            SmsWebhookEventType value,
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
        public const string SmsScheduled = "sms.scheduled";

        public const string SmsSent = "sms.sent";

        public const string SmsDelivered = "sms.delivered";

        public const string SmsUndelivered = "sms.undelivered";

        public const string SmsFailed = "sms.failed";

        public const string SmsSuppressed = "sms.suppressed";

        public const string SmsCanceled = "sms.canceled";
    }
}
