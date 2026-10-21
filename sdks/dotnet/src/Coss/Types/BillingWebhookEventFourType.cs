using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(BillingWebhookEventFourType.BillingWebhookEventFourTypeSerializer))]
[Serializable]
public readonly record struct BillingWebhookEventFourType : IStringEnum
{
    public static readonly BillingWebhookEventFourType BillingHoldPlaced = new(
        Values.BillingHoldPlaced
    );

    public static readonly BillingWebhookEventFourType BillingHoldLifted = new(
        Values.BillingHoldLifted
    );

    public BillingWebhookEventFourType(string value)
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
    public static BillingWebhookEventFourType FromCustom(string value)
    {
        return new BillingWebhookEventFourType(value);
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

    public static bool operator ==(BillingWebhookEventFourType value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(BillingWebhookEventFourType value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(BillingWebhookEventFourType value) => value.Value;

    public static explicit operator BillingWebhookEventFourType(string value) => new(value);

    internal class BillingWebhookEventFourTypeSerializer
        : JsonConverter<BillingWebhookEventFourType>
    {
        public override BillingWebhookEventFourType Read(
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
            return new BillingWebhookEventFourType(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            BillingWebhookEventFourType value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override BillingWebhookEventFourType ReadAsPropertyName(
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
            return new BillingWebhookEventFourType(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            BillingWebhookEventFourType value,
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
        public const string BillingHoldPlaced = "billing.hold_placed";

        public const string BillingHoldLifted = "billing.hold_lifted";
    }
}
