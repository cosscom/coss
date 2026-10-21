using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(BillingWebhookEventSixType.BillingWebhookEventSixTypeSerializer))]
[Serializable]
public readonly record struct BillingWebhookEventSixType : IStringEnum
{
    public static readonly BillingWebhookEventSixType BillingBudgetThresholdReached = new(
        Values.BillingBudgetThresholdReached
    );

    public BillingWebhookEventSixType(string value)
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
    public static BillingWebhookEventSixType FromCustom(string value)
    {
        return new BillingWebhookEventSixType(value);
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

    public static bool operator ==(BillingWebhookEventSixType value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(BillingWebhookEventSixType value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(BillingWebhookEventSixType value) => value.Value;

    public static explicit operator BillingWebhookEventSixType(string value) => new(value);

    internal class BillingWebhookEventSixTypeSerializer : JsonConverter<BillingWebhookEventSixType>
    {
        public override BillingWebhookEventSixType Read(
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
            return new BillingWebhookEventSixType(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            BillingWebhookEventSixType value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override BillingWebhookEventSixType ReadAsPropertyName(
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
            return new BillingWebhookEventSixType(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            BillingWebhookEventSixType value,
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
        public const string BillingBudgetThresholdReached = "billing.budget_threshold_reached";
    }
}
