using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(InvoiceLineObject.InvoiceLineObjectSerializer))]
[Serializable]
public readonly record struct InvoiceLineObject : IStringEnum
{
    public static readonly InvoiceLineObject InvoiceLine = new(Values.InvoiceLine);

    public InvoiceLineObject(string value)
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
    public static InvoiceLineObject FromCustom(string value)
    {
        return new InvoiceLineObject(value);
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

    public static bool operator ==(InvoiceLineObject value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(InvoiceLineObject value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(InvoiceLineObject value) => value.Value;

    public static explicit operator InvoiceLineObject(string value) => new(value);

    internal class InvoiceLineObjectSerializer : JsonConverter<InvoiceLineObject>
    {
        public override InvoiceLineObject Read(
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
            return new InvoiceLineObject(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            InvoiceLineObject value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override InvoiceLineObject ReadAsPropertyName(
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
            return new InvoiceLineObject(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            InvoiceLineObject value,
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
        public const string InvoiceLine = "invoice_line";
    }
}
