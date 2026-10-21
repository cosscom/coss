using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(ReceivedSmsWebhookEventType.ReceivedSmsWebhookEventTypeSerializer))]
[Serializable]
public readonly record struct ReceivedSmsWebhookEventType : IStringEnum
{
    public static readonly ReceivedSmsWebhookEventType SmsReceived = new(Values.SmsReceived);

    public static readonly ReceivedSmsWebhookEventType SmsOptedOut = new(Values.SmsOptedOut);

    public static readonly ReceivedSmsWebhookEventType SmsOptedIn = new(Values.SmsOptedIn);

    public ReceivedSmsWebhookEventType(string value)
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
    public static ReceivedSmsWebhookEventType FromCustom(string value)
    {
        return new ReceivedSmsWebhookEventType(value);
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

    public static bool operator ==(ReceivedSmsWebhookEventType value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(ReceivedSmsWebhookEventType value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(ReceivedSmsWebhookEventType value) => value.Value;

    public static explicit operator ReceivedSmsWebhookEventType(string value) => new(value);

    internal class ReceivedSmsWebhookEventTypeSerializer
        : JsonConverter<ReceivedSmsWebhookEventType>
    {
        public override ReceivedSmsWebhookEventType Read(
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
            return new ReceivedSmsWebhookEventType(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            ReceivedSmsWebhookEventType value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override ReceivedSmsWebhookEventType ReadAsPropertyName(
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
            return new ReceivedSmsWebhookEventType(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            ReceivedSmsWebhookEventType value,
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
        public const string SmsReceived = "sms.received";

        public const string SmsOptedOut = "sms.opted_out";

        public const string SmsOptedIn = "sms.opted_in";
    }
}
