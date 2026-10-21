using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(SmsEventType.SmsEventTypeSerializer))]
[Serializable]
public readonly record struct SmsEventType : IStringEnum
{
    public static readonly SmsEventType SmsScheduled = new(Values.SmsScheduled);

    public static readonly SmsEventType SmsSent = new(Values.SmsSent);

    public static readonly SmsEventType SmsDelivered = new(Values.SmsDelivered);

    public static readonly SmsEventType SmsUndelivered = new(Values.SmsUndelivered);

    public static readonly SmsEventType SmsFailed = new(Values.SmsFailed);

    public static readonly SmsEventType SmsSuppressed = new(Values.SmsSuppressed);

    public static readonly SmsEventType SmsCanceled = new(Values.SmsCanceled);

    public SmsEventType(string value)
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
    public static SmsEventType FromCustom(string value)
    {
        return new SmsEventType(value);
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

    public static bool operator ==(SmsEventType value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(SmsEventType value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(SmsEventType value) => value.Value;

    public static explicit operator SmsEventType(string value) => new(value);

    internal class SmsEventTypeSerializer : JsonConverter<SmsEventType>
    {
        public override SmsEventType Read(
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
            return new SmsEventType(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            SmsEventType value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override SmsEventType ReadAsPropertyName(
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
            return new SmsEventType(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            SmsEventType value,
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
