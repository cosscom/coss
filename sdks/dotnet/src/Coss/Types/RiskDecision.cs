using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(RiskDecision.RiskDecisionSerializer))]
[Serializable]
public readonly record struct RiskDecision : IStringEnum
{
    public static readonly RiskDecision Allow = new(Values.Allow);

    public static readonly RiskDecision Review = new(Values.Review);

    public static readonly RiskDecision Block = new(Values.Block);

    public RiskDecision(string value)
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
    public static RiskDecision FromCustom(string value)
    {
        return new RiskDecision(value);
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

    public static bool operator ==(RiskDecision value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(RiskDecision value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(RiskDecision value) => value.Value;

    public static explicit operator RiskDecision(string value) => new(value);

    internal class RiskDecisionSerializer : JsonConverter<RiskDecision>
    {
        public override RiskDecision Read(
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
            return new RiskDecision(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            RiskDecision value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override RiskDecision ReadAsPropertyName(
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
            return new RiskDecision(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            RiskDecision value,
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
        public const string Allow = "allow";

        public const string Review = "review";

        public const string Block = "block";
    }
}
