using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(InvoiceSummaryObject.InvoiceSummaryObjectSerializer))]
[Serializable]
public readonly record struct InvoiceSummaryObject : IStringEnum
{
    public static readonly InvoiceSummaryObject Invoice = new(Values.Invoice);

    public InvoiceSummaryObject(string value)
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
    public static InvoiceSummaryObject FromCustom(string value)
    {
        return new InvoiceSummaryObject(value);
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

    public static bool operator ==(InvoiceSummaryObject value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(InvoiceSummaryObject value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(InvoiceSummaryObject value) => value.Value;

    public static explicit operator InvoiceSummaryObject(string value) => new(value);

    internal class InvoiceSummaryObjectSerializer : JsonConverter<InvoiceSummaryObject>
    {
        public override InvoiceSummaryObject Read(
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
            return new InvoiceSummaryObject(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            InvoiceSummaryObject value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override InvoiceSummaryObject ReadAsPropertyName(
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
            return new InvoiceSummaryObject(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            InvoiceSummaryObject value,
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
        public const string Invoice = "invoice";
    }
}
