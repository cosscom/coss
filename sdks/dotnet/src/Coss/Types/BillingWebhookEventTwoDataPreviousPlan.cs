using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(
    typeof(BillingWebhookEventTwoDataPreviousPlan.BillingWebhookEventTwoDataPreviousPlanSerializer)
)]
[Serializable]
public readonly record struct BillingWebhookEventTwoDataPreviousPlan : IStringEnum
{
    public static readonly BillingWebhookEventTwoDataPreviousPlan Free = new(Values.Free);

    public static readonly BillingWebhookEventTwoDataPreviousPlan Pro = new(Values.Pro);

    public static readonly BillingWebhookEventTwoDataPreviousPlan Scale = new(Values.Scale);

    public static readonly BillingWebhookEventTwoDataPreviousPlan Enterprise = new(
        Values.Enterprise
    );

    public BillingWebhookEventTwoDataPreviousPlan(string value)
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
    public static BillingWebhookEventTwoDataPreviousPlan FromCustom(string value)
    {
        return new BillingWebhookEventTwoDataPreviousPlan(value);
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

    public static bool operator ==(BillingWebhookEventTwoDataPreviousPlan value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(BillingWebhookEventTwoDataPreviousPlan value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(BillingWebhookEventTwoDataPreviousPlan value) =>
        value.Value;

    public static explicit operator BillingWebhookEventTwoDataPreviousPlan(string value) =>
        new(value);

    internal class BillingWebhookEventTwoDataPreviousPlanSerializer
        : JsonConverter<BillingWebhookEventTwoDataPreviousPlan>
    {
        public override BillingWebhookEventTwoDataPreviousPlan Read(
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
            return new BillingWebhookEventTwoDataPreviousPlan(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            BillingWebhookEventTwoDataPreviousPlan value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override BillingWebhookEventTwoDataPreviousPlan ReadAsPropertyName(
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
            return new BillingWebhookEventTwoDataPreviousPlan(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            BillingWebhookEventTwoDataPreviousPlan value,
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
