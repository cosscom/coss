using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss.Risk;

[JsonConverter(typeof(UpdateRiskRuleRequestMatch.UpdateRiskRuleRequestMatchSerializer))]
[Serializable]
public readonly record struct UpdateRiskRuleRequestMatch : IStringEnum
{
    public static readonly UpdateRiskRuleRequestMatch All = new(Values.All);

    public static readonly UpdateRiskRuleRequestMatch Any = new(Values.Any);

    public UpdateRiskRuleRequestMatch(string value)
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
    public static UpdateRiskRuleRequestMatch FromCustom(string value)
    {
        return new UpdateRiskRuleRequestMatch(value);
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

    public static bool operator ==(UpdateRiskRuleRequestMatch value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(UpdateRiskRuleRequestMatch value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(UpdateRiskRuleRequestMatch value) => value.Value;

    public static explicit operator UpdateRiskRuleRequestMatch(string value) => new(value);

    internal class UpdateRiskRuleRequestMatchSerializer : JsonConverter<UpdateRiskRuleRequestMatch>
    {
        public override UpdateRiskRuleRequestMatch Read(
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
            return new UpdateRiskRuleRequestMatch(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            UpdateRiskRuleRequestMatch value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override UpdateRiskRuleRequestMatch ReadAsPropertyName(
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
            return new UpdateRiskRuleRequestMatch(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            UpdateRiskRuleRequestMatch value,
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
        public const string All = "all";

        public const string Any = "any";
    }
}
