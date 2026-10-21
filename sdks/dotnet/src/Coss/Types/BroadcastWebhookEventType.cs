using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(BroadcastWebhookEventType.BroadcastWebhookEventTypeSerializer))]
[Serializable]
public readonly record struct BroadcastWebhookEventType : IStringEnum
{
    public static readonly BroadcastWebhookEventType BroadcastSending = new(
        Values.BroadcastSending
    );

    public static readonly BroadcastWebhookEventType BroadcastSent = new(Values.BroadcastSent);

    public static readonly BroadcastWebhookEventType BroadcastPaused = new(Values.BroadcastPaused);

    public static readonly BroadcastWebhookEventType BroadcastCanceled = new(
        Values.BroadcastCanceled
    );

    public static readonly BroadcastWebhookEventType BroadcastFailed = new(Values.BroadcastFailed);

    public BroadcastWebhookEventType(string value)
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
    public static BroadcastWebhookEventType FromCustom(string value)
    {
        return new BroadcastWebhookEventType(value);
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

    public static bool operator ==(BroadcastWebhookEventType value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(BroadcastWebhookEventType value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(BroadcastWebhookEventType value) => value.Value;

    public static explicit operator BroadcastWebhookEventType(string value) => new(value);

    internal class BroadcastWebhookEventTypeSerializer : JsonConverter<BroadcastWebhookEventType>
    {
        public override BroadcastWebhookEventType Read(
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
            return new BroadcastWebhookEventType(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            BroadcastWebhookEventType value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override BroadcastWebhookEventType ReadAsPropertyName(
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
            return new BroadcastWebhookEventType(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            BroadcastWebhookEventType value,
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
        public const string BroadcastSending = "broadcast.sending";

        public const string BroadcastSent = "broadcast.sent";

        public const string BroadcastPaused = "broadcast.paused";

        public const string BroadcastCanceled = "broadcast.canceled";

        public const string BroadcastFailed = "broadcast.failed";
    }
}
