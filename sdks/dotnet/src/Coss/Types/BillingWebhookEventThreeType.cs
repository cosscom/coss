using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(BillingWebhookEventThreeType.BillingWebhookEventThreeTypeSerializer))]
[Serializable]
public readonly record struct BillingWebhookEventThreeType : IStringEnum
{
    public static readonly BillingWebhookEventThreeType BillingUsageThresholdReached = new(
        Values.BillingUsageThresholdReached
    );

    public BillingWebhookEventThreeType(string value)
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
    public static BillingWebhookEventThreeType FromCustom(string value)
    {
        return new BillingWebhookEventThreeType(value);
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

    public static bool operator ==(BillingWebhookEventThreeType value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(BillingWebhookEventThreeType value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(BillingWebhookEventThreeType value) => value.Value;

    public static explicit operator BillingWebhookEventThreeType(string value) => new(value);

    internal class BillingWebhookEventThreeTypeSerializer
        : JsonConverter<BillingWebhookEventThreeType>
    {
        public override BillingWebhookEventThreeType Read(
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
            return new BillingWebhookEventThreeType(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            BillingWebhookEventThreeType value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override BillingWebhookEventThreeType ReadAsPropertyName(
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
            return new BillingWebhookEventThreeType(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            BillingWebhookEventThreeType value,
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
        public const string BillingUsageThresholdReached = "billing.usage_threshold_reached";
    }
}
