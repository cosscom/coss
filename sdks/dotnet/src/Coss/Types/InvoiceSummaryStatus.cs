using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(InvoiceSummaryStatus.InvoiceSummaryStatusSerializer))]
[Serializable]
public readonly record struct InvoiceSummaryStatus : IStringEnum
{
    public static readonly InvoiceSummaryStatus Open = new(Values.Open);

    public static readonly InvoiceSummaryStatus Paid = new(Values.Paid);

    public static readonly InvoiceSummaryStatus Void = new(Values.Void);

    public static readonly InvoiceSummaryStatus Uncollectible = new(Values.Uncollectible);

    public InvoiceSummaryStatus(string value)
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
    public static InvoiceSummaryStatus FromCustom(string value)
    {
        return new InvoiceSummaryStatus(value);
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

    public static bool operator ==(InvoiceSummaryStatus value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(InvoiceSummaryStatus value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(InvoiceSummaryStatus value) => value.Value;

    public static explicit operator InvoiceSummaryStatus(string value) => new(value);

    internal class InvoiceSummaryStatusSerializer : JsonConverter<InvoiceSummaryStatus>
    {
        public override InvoiceSummaryStatus Read(
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
            return new InvoiceSummaryStatus(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            InvoiceSummaryStatus value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override InvoiceSummaryStatus ReadAsPropertyName(
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
            return new InvoiceSummaryStatus(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            InvoiceSummaryStatus value,
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
