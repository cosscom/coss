using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(InvoiceCollectionMethod.InvoiceCollectionMethodSerializer))]
[Serializable]
public readonly record struct InvoiceCollectionMethod : IStringEnum
{
    public static readonly InvoiceCollectionMethod ChargeAutomatically = new(
        Values.ChargeAutomatically
    );

    public static readonly InvoiceCollectionMethod SendInvoice = new(Values.SendInvoice);

    public InvoiceCollectionMethod(string value)
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
    public static InvoiceCollectionMethod FromCustom(string value)
    {
        return new InvoiceCollectionMethod(value);
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

    public static bool operator ==(InvoiceCollectionMethod value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(InvoiceCollectionMethod value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(InvoiceCollectionMethod value) => value.Value;

    public static explicit operator InvoiceCollectionMethod(string value) => new(value);

    internal class InvoiceCollectionMethodSerializer : JsonConverter<InvoiceCollectionMethod>
    {
        public override InvoiceCollectionMethod Read(
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
            return new InvoiceCollectionMethod(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            InvoiceCollectionMethod value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override InvoiceCollectionMethod ReadAsPropertyName(
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
            return new InvoiceCollectionMethod(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            InvoiceCollectionMethod value,
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
