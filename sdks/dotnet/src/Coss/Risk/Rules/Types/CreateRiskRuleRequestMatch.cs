using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss.Risk;

[JsonConverter(typeof(CreateRiskRuleRequestMatch.CreateRiskRuleRequestMatchSerializer))]
[Serializable]
public readonly record struct CreateRiskRuleRequestMatch : IStringEnum
{
    public static readonly CreateRiskRuleRequestMatch All = new(Values.All);

    public static readonly CreateRiskRuleRequestMatch Any = new(Values.Any);

    public CreateRiskRuleRequestMatch(string value)
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
    public static CreateRiskRuleRequestMatch FromCustom(string value)
    {
        return new CreateRiskRuleRequestMatch(value);
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

    public static bool operator ==(CreateRiskRuleRequestMatch value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(CreateRiskRuleRequestMatch value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(CreateRiskRuleRequestMatch value) => value.Value;

    public static explicit operator CreateRiskRuleRequestMatch(string value) => new(value);

    internal class CreateRiskRuleRequestMatchSerializer : JsonConverter<CreateRiskRuleRequestMatch>
    {
        public override CreateRiskRuleRequestMatch Read(
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
            return new CreateRiskRuleRequestMatch(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            CreateRiskRuleRequestMatch value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override CreateRiskRuleRequestMatch ReadAsPropertyName(
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
            return new CreateRiskRuleRequestMatch(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            CreateRiskRuleRequestMatch value,
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
