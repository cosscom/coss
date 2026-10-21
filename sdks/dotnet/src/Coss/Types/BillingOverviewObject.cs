using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(BillingOverviewObject.BillingOverviewObjectSerializer))]
[Serializable]
public readonly record struct BillingOverviewObject : IStringEnum
{
    public static readonly BillingOverviewObject Billing = new(Values.Billing);

    public BillingOverviewObject(string value)
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
    public static BillingOverviewObject FromCustom(string value)
    {
        return new BillingOverviewObject(value);
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

    public static bool operator ==(BillingOverviewObject value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(BillingOverviewObject value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(BillingOverviewObject value) => value.Value;

    public static explicit operator BillingOverviewObject(string value) => new(value);

    internal class BillingOverviewObjectSerializer : JsonConverter<BillingOverviewObject>
    {
        public override BillingOverviewObject Read(
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
            return new BillingOverviewObject(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            BillingOverviewObject value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override BillingOverviewObject ReadAsPropertyName(
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
            return new BillingOverviewObject(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            BillingOverviewObject value,
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
        public const string Billing = "billing";
    }
}
