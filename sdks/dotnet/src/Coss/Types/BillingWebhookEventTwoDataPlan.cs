using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(BillingWebhookEventTwoDataPlan.BillingWebhookEventTwoDataPlanSerializer))]
[Serializable]
public readonly record struct BillingWebhookEventTwoDataPlan : IStringEnum
{
    public static readonly BillingWebhookEventTwoDataPlan Free = new(Values.Free);

    public static readonly BillingWebhookEventTwoDataPlan Pro = new(Values.Pro);

    public static readonly BillingWebhookEventTwoDataPlan Scale = new(Values.Scale);

    public static readonly BillingWebhookEventTwoDataPlan Enterprise = new(Values.Enterprise);

    public BillingWebhookEventTwoDataPlan(string value)
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
    public static BillingWebhookEventTwoDataPlan FromCustom(string value)
    {
        return new BillingWebhookEventTwoDataPlan(value);
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

    public static bool operator ==(BillingWebhookEventTwoDataPlan value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(BillingWebhookEventTwoDataPlan value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(BillingWebhookEventTwoDataPlan value) => value.Value;

    public static explicit operator BillingWebhookEventTwoDataPlan(string value) => new(value);

    internal class BillingWebhookEventTwoDataPlanSerializer
        : JsonConverter<BillingWebhookEventTwoDataPlan>
    {
        public override BillingWebhookEventTwoDataPlan Read(
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
            return new BillingWebhookEventTwoDataPlan(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            BillingWebhookEventTwoDataPlan value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override BillingWebhookEventTwoDataPlan ReadAsPropertyName(
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
            return new BillingWebhookEventTwoDataPlan(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            BillingWebhookEventTwoDataPlan value,
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
        public const string Free = "free";

        public const string Pro = "pro";

        public const string Scale = "scale";

        public const string Enterprise = "enterprise";
    }
}
