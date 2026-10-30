using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(
    typeof(InboxMessageReceivedWebhookEventType.InboxMessageReceivedWebhookEventTypeSerializer)
)]
[Serializable]
public readonly record struct InboxMessageReceivedWebhookEventType : IStringEnum
{
    public static readonly InboxMessageReceivedWebhookEventType InboxMessageReceived = new(
        Values.InboxMessageReceived
    );

    public InboxMessageReceivedWebhookEventType(string value)
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
    public static InboxMessageReceivedWebhookEventType FromCustom(string value)
    {
        return new InboxMessageReceivedWebhookEventType(value);
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

    public static bool operator ==(InboxMessageReceivedWebhookEventType value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(InboxMessageReceivedWebhookEventType value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(InboxMessageReceivedWebhookEventType value) =>
        value.Value;

    public static explicit operator InboxMessageReceivedWebhookEventType(string value) =>
        new(value);

    internal class InboxMessageReceivedWebhookEventTypeSerializer
        : JsonConverter<InboxMessageReceivedWebhookEventType>
    {
        public override InboxMessageReceivedWebhookEventType Read(
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
            return new InboxMessageReceivedWebhookEventType(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            InboxMessageReceivedWebhookEventType value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override InboxMessageReceivedWebhookEventType ReadAsPropertyName(
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
            return new InboxMessageReceivedWebhookEventType(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            InboxMessageReceivedWebhookEventType value,
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
        public const string InboxMessageReceived = "inbox.message.received";
    }
}
