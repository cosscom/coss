using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(BillingWebhookEventSevenType.BillingWebhookEventSevenTypeSerializer))]
[Serializable]
public readonly record struct BillingWebhookEventSevenType : IStringEnum
{
    public static readonly BillingWebhookEventSevenType BillingBudgetHoldPlaced = new(
        Values.BillingBudgetHoldPlaced
    );

    public static readonly BillingWebhookEventSevenType BillingBudgetHoldLifted = new(
        Values.BillingBudgetHoldLifted
    );

    public BillingWebhookEventSevenType(string value)
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
    public static BillingWebhookEventSevenType FromCustom(string value)
    {
        return new BillingWebhookEventSevenType(value);
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

    public static bool operator ==(BillingWebhookEventSevenType value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(BillingWebhookEventSevenType value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(BillingWebhookEventSevenType value) => value.Value;

    public static explicit operator BillingWebhookEventSevenType(string value) => new(value);

    internal class BillingWebhookEventSevenTypeSerializer
        : JsonConverter<BillingWebhookEventSevenType>
    {
        public override BillingWebhookEventSevenType Read(
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
            return new BillingWebhookEventSevenType(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            BillingWebhookEventSevenType value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override BillingWebhookEventSevenType ReadAsPropertyName(
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
            return new BillingWebhookEventSevenType(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            BillingWebhookEventSevenType value,
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
        public const string BillingBudgetHoldPlaced = "billing.budget_hold_placed";

        public const string BillingBudgetHoldLifted = "billing.budget_hold_lifted";
    }
}
