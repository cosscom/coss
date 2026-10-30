using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(
    typeof(InboxMessageReceivedWebhookEventObject.InboxMessageReceivedWebhookEventObjectSerializer)
)]
[Serializable]
public readonly record struct InboxMessageReceivedWebhookEventObject : IStringEnum
{
    public static readonly InboxMessageReceivedWebhookEventObject Event = new(Values.Event);

    public InboxMessageReceivedWebhookEventObject(string value)
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
    public static InboxMessageReceivedWebhookEventObject FromCustom(string value)
    {
        return new InboxMessageReceivedWebhookEventObject(value);
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

    public static bool operator ==(InboxMessageReceivedWebhookEventObject value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(InboxMessageReceivedWebhookEventObject value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(InboxMessageReceivedWebhookEventObject value) =>
        value.Value;

    public static explicit operator InboxMessageReceivedWebhookEventObject(string value) =>
        new(value);

    internal class InboxMessageReceivedWebhookEventObjectSerializer
        : JsonConverter<InboxMessageReceivedWebhookEventObject>
    {
        public override InboxMessageReceivedWebhookEventObject Read(
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
            return new InboxMessageReceivedWebhookEventObject(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            InboxMessageReceivedWebhookEventObject value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override InboxMessageReceivedWebhookEventObject ReadAsPropertyName(
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
            return new InboxMessageReceivedWebhookEventObject(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            InboxMessageReceivedWebhookEventObject value,
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
        public const string Event = "event";
    }
}
