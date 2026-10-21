using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(ReceivedEmailWebhookEventType.ReceivedEmailWebhookEventTypeSerializer))]
[Serializable]
public readonly record struct ReceivedEmailWebhookEventType : IStringEnum
{
    public static readonly ReceivedEmailWebhookEventType EmailReceived = new(Values.EmailReceived);

    public ReceivedEmailWebhookEventType(string value)
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
    public static ReceivedEmailWebhookEventType FromCustom(string value)
    {
        return new ReceivedEmailWebhookEventType(value);
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

    public static bool operator ==(ReceivedEmailWebhookEventType value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(ReceivedEmailWebhookEventType value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(ReceivedEmailWebhookEventType value) => value.Value;

    public static explicit operator ReceivedEmailWebhookEventType(string value) => new(value);

    internal class ReceivedEmailWebhookEventTypeSerializer
        : JsonConverter<ReceivedEmailWebhookEventType>
    {
        public override ReceivedEmailWebhookEventType Read(
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
            return new ReceivedEmailWebhookEventType(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            ReceivedEmailWebhookEventType value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override ReceivedEmailWebhookEventType ReadAsPropertyName(
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
            return new ReceivedEmailWebhookEventType(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            ReceivedEmailWebhookEventType value,
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
        public const string EmailReceived = "email.received";
    }
}
