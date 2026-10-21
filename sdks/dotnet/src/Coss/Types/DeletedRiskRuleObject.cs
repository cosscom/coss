using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(DeletedRiskRuleObject.DeletedRiskRuleObjectSerializer))]
[Serializable]
public readonly record struct DeletedRiskRuleObject : IStringEnum
{
    public static readonly DeletedRiskRuleObject RiskRule = new(Values.RiskRule);

    public DeletedRiskRuleObject(string value)
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
    public static DeletedRiskRuleObject FromCustom(string value)
    {
        return new DeletedRiskRuleObject(value);
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

    public static bool operator ==(DeletedRiskRuleObject value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(DeletedRiskRuleObject value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(DeletedRiskRuleObject value) => value.Value;

    public static explicit operator DeletedRiskRuleObject(string value) => new(value);

    internal class DeletedRiskRuleObjectSerializer : JsonConverter<DeletedRiskRuleObject>
    {
        public override DeletedRiskRuleObject Read(
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
            return new DeletedRiskRuleObject(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            DeletedRiskRuleObject value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override DeletedRiskRuleObject ReadAsPropertyName(
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
            return new DeletedRiskRuleObject(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            DeletedRiskRuleObject value,
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
