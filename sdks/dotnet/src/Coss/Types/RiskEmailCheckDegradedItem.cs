using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(RiskEmailCheckDegradedItem.RiskEmailCheckDegradedItemSerializer))]
[Serializable]
public readonly record struct RiskEmailCheckDegradedItem : IStringEnum
{
    public static readonly RiskEmailCheckDegradedItem EmailDns = new(Values.EmailDns);

    public static readonly RiskEmailCheckDegradedItem DomainAge = new(Values.DomainAge);

    public RiskEmailCheckDegradedItem(string value)
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
    public static RiskEmailCheckDegradedItem FromCustom(string value)
    {
        return new RiskEmailCheckDegradedItem(value);
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

    public static bool operator ==(RiskEmailCheckDegradedItem value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(RiskEmailCheckDegradedItem value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(RiskEmailCheckDegradedItem value) => value.Value;

    public static explicit operator RiskEmailCheckDegradedItem(string value) => new(value);

    internal class RiskEmailCheckDegradedItemSerializer : JsonConverter<RiskEmailCheckDegradedItem>
    {
        public override RiskEmailCheckDegradedItem Read(
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
            return new RiskEmailCheckDegradedItem(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            RiskEmailCheckDegradedItem value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override RiskEmailCheckDegradedItem ReadAsPropertyName(
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
            return new RiskEmailCheckDegradedItem(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            RiskEmailCheckDegradedItem value,
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
        public const string EmailDns = "email_dns";

        public const string DomainAge = "domain_age";
    }
}
