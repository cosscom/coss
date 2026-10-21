using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(InvoiceStatus.InvoiceStatusSerializer))]
[Serializable]
public readonly record struct InvoiceStatus : IStringEnum
{
    public static readonly InvoiceStatus Open = new(Values.Open);

    public static readonly InvoiceStatus Paid = new(Values.Paid);

    public static readonly InvoiceStatus Void = new(Values.Void);

    public static readonly InvoiceStatus Uncollectible = new(Values.Uncollectible);

    public InvoiceStatus(string value)
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
    public static InvoiceStatus FromCustom(string value)
    {
        return new InvoiceStatus(value);
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

    public static bool operator ==(InvoiceStatus value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(InvoiceStatus value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(InvoiceStatus value) => value.Value;

    public static explicit operator InvoiceStatus(string value) => new(value);

    internal class InvoiceStatusSerializer : JsonConverter<InvoiceStatus>
    {
        public override InvoiceStatus Read(
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
            return new InvoiceStatus(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            InvoiceStatus value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override InvoiceStatus ReadAsPropertyName(
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
            return new InvoiceStatus(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            InvoiceStatus value,
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
        public const string Open = "open";

        public const string Paid = "paid";

        public const string Void = "void";

        public const string Uncollectible = "uncollectible";
    }
}
