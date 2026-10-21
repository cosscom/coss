using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(
    typeof(BroadcastWebhookEventDataBroadcastStatus.BroadcastWebhookEventDataBroadcastStatusSerializer)
)]
[Serializable]
public readonly record struct BroadcastWebhookEventDataBroadcastStatus : IStringEnum
{
    public static readonly BroadcastWebhookEventDataBroadcastStatus Draft = new(Values.Draft);

    public static readonly BroadcastWebhookEventDataBroadcastStatus Scheduled = new(
        Values.Scheduled
    );

    public static readonly BroadcastWebhookEventDataBroadcastStatus Sending = new(Values.Sending);

    public static readonly BroadcastWebhookEventDataBroadcastStatus Paused = new(Values.Paused);

    public static readonly BroadcastWebhookEventDataBroadcastStatus Sent = new(Values.Sent);

    public static readonly BroadcastWebhookEventDataBroadcastStatus Canceled = new(Values.Canceled);

    public static readonly BroadcastWebhookEventDataBroadcastStatus Failed = new(Values.Failed);

    public BroadcastWebhookEventDataBroadcastStatus(string value)
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
    public static BroadcastWebhookEventDataBroadcastStatus FromCustom(string value)
    {
        return new BroadcastWebhookEventDataBroadcastStatus(value);
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

    public static bool operator ==(
        BroadcastWebhookEventDataBroadcastStatus value1,
        string value2
    ) => value1.Value.Equals(value2);

    public static bool operator !=(
        BroadcastWebhookEventDataBroadcastStatus value1,
        string value2
    ) => !value1.Value.Equals(value2);

    public static explicit operator string(BroadcastWebhookEventDataBroadcastStatus value) =>
        value.Value;

    public static explicit operator BroadcastWebhookEventDataBroadcastStatus(string value) =>
        new(value);

    internal class BroadcastWebhookEventDataBroadcastStatusSerializer
        : JsonConverter<BroadcastWebhookEventDataBroadcastStatus>
    {
        public override BroadcastWebhookEventDataBroadcastStatus Read(
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
            return new BroadcastWebhookEventDataBroadcastStatus(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            BroadcastWebhookEventDataBroadcastStatus value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override BroadcastWebhookEventDataBroadcastStatus ReadAsPropertyName(
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
            return new BroadcastWebhookEventDataBroadcastStatus(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            BroadcastWebhookEventDataBroadcastStatus value,
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
        public const string Draft = "draft";

        public const string Scheduled = "scheduled";

        public const string Sending = "sending";

        public const string Paused = "paused";

        public const string Sent = "sent";

        public const string Canceled = "canceled";

        public const string Failed = "failed";
    }
}
