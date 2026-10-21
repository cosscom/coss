using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(InvoiceSummaryCollectionMethod.InvoiceSummaryCollectionMethodSerializer))]
[Serializable]
public readonly record struct InvoiceSummaryCollectionMethod : IStringEnum
{
    public static readonly InvoiceSummaryCollectionMethod ChargeAutomatically = new(
        Values.ChargeAutomatically
    );

    public static readonly InvoiceSummaryCollectionMethod SendInvoice = new(Values.SendInvoice);

    public InvoiceSummaryCollectionMethod(string value)
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
    public static InvoiceSummaryCollectionMethod FromCustom(string value)
    {
        return new InvoiceSummaryCollectionMethod(value);
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

    public static bool operator ==(InvoiceSummaryCollectionMethod value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(InvoiceSummaryCollectionMethod value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(InvoiceSummaryCollectionMethod value) => value.Value;

    public static explicit operator InvoiceSummaryCollectionMethod(string value) => new(value);

    internal class InvoiceSummaryCollectionMethodSerializer
        : JsonConverter<InvoiceSummaryCollectionMethod>
    {
        public override InvoiceSummaryCollectionMethod Read(
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
            return new InvoiceSummaryCollectionMethod(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            InvoiceSummaryCollectionMethod value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override InvoiceSummaryCollectionMethod ReadAsPropertyName(
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
            return new InvoiceSummaryCollectionMethod(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            InvoiceSummaryCollectionMethod value,
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
        public const string ChargeAutomatically = "charge_automatically";

        public const string SendInvoice = "send_invoice";
    }
}
