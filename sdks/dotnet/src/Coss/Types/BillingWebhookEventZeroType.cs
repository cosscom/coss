using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(BillingWebhookEventZeroType.BillingWebhookEventZeroTypeSerializer))]
[Serializable]
public readonly record struct BillingWebhookEventZeroType : IStringEnum
{
    public static readonly BillingWebhookEventZeroType BillingInvoiceFinalized = new(
        Values.BillingInvoiceFinalized
    );

    public static readonly BillingWebhookEventZeroType BillingInvoicePaid = new(
        Values.BillingInvoicePaid
    );

    public static readonly BillingWebhookEventZeroType BillingInvoiceVoided = new(
        Values.BillingInvoiceVoided
    );

    public BillingWebhookEventZeroType(string value)
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
    public static BillingWebhookEventZeroType FromCustom(string value)
    {
        return new BillingWebhookEventZeroType(value);
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

    public static bool operator ==(BillingWebhookEventZeroType value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(BillingWebhookEventZeroType value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(BillingWebhookEventZeroType value) => value.Value;

    public static explicit operator BillingWebhookEventZeroType(string value) => new(value);

    internal class BillingWebhookEventZeroTypeSerializer
        : JsonConverter<BillingWebhookEventZeroType>
    {
        public override BillingWebhookEventZeroType Read(
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
            return new BillingWebhookEventZeroType(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            BillingWebhookEventZeroType value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override BillingWebhookEventZeroType ReadAsPropertyName(
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
            return new BillingWebhookEventZeroType(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            BillingWebhookEventZeroType value,
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
        public const string BillingInvoiceFinalized = "billing.invoice_finalized";

        public const string BillingInvoicePaid = "billing.invoice_paid";

        public const string BillingInvoiceVoided = "billing.invoice_voided";
    }
}
