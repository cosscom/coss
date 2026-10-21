using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(RiskRuleConditionOperator.RiskRuleConditionOperatorSerializer))]
[Serializable]
public readonly record struct RiskRuleConditionOperator : IStringEnum
{
    public static readonly RiskRuleConditionOperator Is = new(Values.Is);

    public static readonly RiskRuleConditionOperator Eq = new(Values.Eq);

    public static readonly RiskRuleConditionOperator Neq = new(Values.Neq);

    public static readonly RiskRuleConditionOperator Gt = new(Values.Gt);

    public static readonly RiskRuleConditionOperator Gte = new(Values.Gte);

    public static readonly RiskRuleConditionOperator Lt = new(Values.Lt);

    public static readonly RiskRuleConditionOperator Lte = new(Values.Lte);

    public static readonly RiskRuleConditionOperator In = new(Values.In);

    public static readonly RiskRuleConditionOperator NotIn = new(Values.NotIn);

    public RiskRuleConditionOperator(string value)
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
    public static RiskRuleConditionOperator FromCustom(string value)
    {
        return new RiskRuleConditionOperator(value);
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

    public static bool operator ==(RiskRuleConditionOperator value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(RiskRuleConditionOperator value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(RiskRuleConditionOperator value) => value.Value;

    public static explicit operator RiskRuleConditionOperator(string value) => new(value);

    internal class RiskRuleConditionOperatorSerializer : JsonConverter<RiskRuleConditionOperator>
    {
        public override RiskRuleConditionOperator Read(
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
            return new RiskRuleConditionOperator(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            RiskRuleConditionOperator value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override RiskRuleConditionOperator ReadAsPropertyName(
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
            return new RiskRuleConditionOperator(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            RiskRuleConditionOperator value,
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
        public const string Is = "is";

        public const string Eq = "eq";

        public const string Neq = "neq";

        public const string Gt = "gt";

        public const string Gte = "gte";

        public const string Lt = "lt";

        public const string Lte = "lte";

        public const string In = "in";

        public const string NotIn = "not_in";
    }
}
