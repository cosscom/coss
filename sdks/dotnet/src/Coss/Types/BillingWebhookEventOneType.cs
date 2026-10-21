using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(BillingWebhookEventOneType.BillingWebhookEventOneTypeSerializer))]
[Serializable]
public readonly record struct BillingWebhookEventOneType : IStringEnum
{
    public static readonly BillingWebhookEventOneType BillingInvoicePaymentFailed = new(
        Values.BillingInvoicePaymentFailed
    );

    public BillingWebhookEventOneType(string value)
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
    public static BillingWebhookEventOneType FromCustom(string value)
    {
        return new BillingWebhookEventOneType(value);
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

    public static bool operator ==(BillingWebhookEventOneType value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(BillingWebhookEventOneType value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(BillingWebhookEventOneType value) => value.Value;

    public static explicit operator BillingWebhookEventOneType(string value) => new(value);

    internal class BillingWebhookEventOneTypeSerializer : JsonConverter<BillingWebhookEventOneType>
    {
        public override BillingWebhookEventOneType Read(
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
            return new BillingWebhookEventOneType(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            BillingWebhookEventOneType value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override BillingWebhookEventOneType ReadAsPropertyName(
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
            return new BillingWebhookEventOneType(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            BillingWebhookEventOneType value,
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
        public const string BillingInvoicePaymentFailed = "billing.invoice_payment_failed";
    }
}
