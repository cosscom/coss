using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss.Billing;

[JsonConverter(typeof(ListInvoicesRequestStatus.ListInvoicesRequestStatusSerializer))]
[Serializable]
public readonly record struct ListInvoicesRequestStatus : IStringEnum
{
    public static readonly ListInvoicesRequestStatus Open = new(Values.Open);

    public static readonly ListInvoicesRequestStatus Paid = new(Values.Paid);

    public static readonly ListInvoicesRequestStatus Void = new(Values.Void);

    public static readonly ListInvoicesRequestStatus Uncollectible = new(Values.Uncollectible);

    public ListInvoicesRequestStatus(string value)
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
    public static ListInvoicesRequestStatus FromCustom(string value)
    {
        return new ListInvoicesRequestStatus(value);
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

    public static bool operator ==(ListInvoicesRequestStatus value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(ListInvoicesRequestStatus value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(ListInvoicesRequestStatus value) => value.Value;

    public static explicit operator ListInvoicesRequestStatus(string value) => new(value);

    internal class ListInvoicesRequestStatusSerializer : JsonConverter<ListInvoicesRequestStatus>
    {
        public override ListInvoicesRequestStatus Read(
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
            return new ListInvoicesRequestStatus(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            ListInvoicesRequestStatus value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override ListInvoicesRequestStatus ReadAsPropertyName(
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
            return new ListInvoicesRequestStatus(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            ListInvoicesRequestStatus value,
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
