using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(RiskRuleObject.RiskRuleObjectSerializer))]
[Serializable]
public readonly record struct RiskRuleObject : IStringEnum
{
    public static readonly RiskRuleObject RiskRule = new(Values.RiskRule);

    public RiskRuleObject(string value)
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
    public static RiskRuleObject FromCustom(string value)
    {
        return new RiskRuleObject(value);
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

    public static bool operator ==(RiskRuleObject value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(RiskRuleObject value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(RiskRuleObject value) => value.Value;

    public static explicit operator RiskRuleObject(string value) => new(value);

    internal class RiskRuleObjectSerializer : JsonConverter<RiskRuleObject>
    {
        public override RiskRuleObject Read(
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
            return new RiskRuleObject(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            RiskRuleObject value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override RiskRuleObject ReadAsPropertyName(
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
            return new RiskRuleObject(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            RiskRuleObject value,
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
        public const string RiskRule = "risk_rule";
    }
}
