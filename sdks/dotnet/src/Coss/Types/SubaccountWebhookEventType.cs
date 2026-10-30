using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(SubaccountWebhookEventType.SubaccountWebhookEventTypeSerializer))]
[Serializable]
public readonly record struct SubaccountWebhookEventType : IStringEnum
{
    public static readonly SubaccountWebhookEventType SubaccountReputationWarning = new(
        Values.SubaccountReputationWarning
    );

    public static readonly SubaccountWebhookEventType SubaccountReputationRecovered = new(
        Values.SubaccountReputationRecovered
    );

    public static readonly SubaccountWebhookEventType SubaccountPaused = new(
        Values.SubaccountPaused
    );

    public static readonly SubaccountWebhookEventType SubaccountReinstated = new(
        Values.SubaccountReinstated
    );

    public SubaccountWebhookEventType(string value)
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
    public static SubaccountWebhookEventType FromCustom(string value)
    {
        return new SubaccountWebhookEventType(value);
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

    public static bool operator ==(SubaccountWebhookEventType value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(SubaccountWebhookEventType value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(SubaccountWebhookEventType value) => value.Value;

    public static explicit operator SubaccountWebhookEventType(string value) => new(value);

    internal class SubaccountWebhookEventTypeSerializer : JsonConverter<SubaccountWebhookEventType>
    {
        public override SubaccountWebhookEventType Read(
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
            return new SubaccountWebhookEventType(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            SubaccountWebhookEventType value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override SubaccountWebhookEventType ReadAsPropertyName(
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
            return new SubaccountWebhookEventType(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            SubaccountWebhookEventType value,
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
        public const string SubaccountReputationWarning = "subaccount.reputation_warning";

        public const string SubaccountReputationRecovered = "subaccount.reputation_recovered";

        public const string SubaccountPaused = "subaccount.paused";

        public const string SubaccountReinstated = "subaccount.reinstated";
    }
}
