using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(BillingWebhookEventTwoType.BillingWebhookEventTwoTypeSerializer))]
[Serializable]
public readonly record struct BillingWebhookEventTwoType : IStringEnum
{
    public static readonly BillingWebhookEventTwoType BillingPlanChanged = new(
        Values.BillingPlanChanged
    );

    public BillingWebhookEventTwoType(string value)
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
    public static BillingWebhookEventTwoType FromCustom(string value)
    {
        return new BillingWebhookEventTwoType(value);
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

    public static bool operator ==(BillingWebhookEventTwoType value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(BillingWebhookEventTwoType value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(BillingWebhookEventTwoType value) => value.Value;

    public static explicit operator BillingWebhookEventTwoType(string value) => new(value);

    internal class BillingWebhookEventTwoTypeSerializer : JsonConverter<BillingWebhookEventTwoType>
    {
        public override BillingWebhookEventTwoType Read(
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
            return new BillingWebhookEventTwoType(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            BillingWebhookEventTwoType value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override BillingWebhookEventTwoType ReadAsPropertyName(
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
            return new BillingWebhookEventTwoType(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            BillingWebhookEventTwoType value,
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
        public const string BillingPlanChanged = "billing.plan_changed";
    }
}
