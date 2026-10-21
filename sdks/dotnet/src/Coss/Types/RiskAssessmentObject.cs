using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(RiskAssessmentObject.RiskAssessmentObjectSerializer))]
[Serializable]
public readonly record struct RiskAssessmentObject : IStringEnum
{
    public static readonly RiskAssessmentObject RiskAssessment = new(Values.RiskAssessment);

    public RiskAssessmentObject(string value)
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
    public static RiskAssessmentObject FromCustom(string value)
    {
        return new RiskAssessmentObject(value);
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

    public static bool operator ==(RiskAssessmentObject value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(RiskAssessmentObject value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(RiskAssessmentObject value) => value.Value;

    public static explicit operator RiskAssessmentObject(string value) => new(value);

    internal class RiskAssessmentObjectSerializer : JsonConverter<RiskAssessmentObject>
    {
        public override RiskAssessmentObject Read(
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
            return new RiskAssessmentObject(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            RiskAssessmentObject value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override RiskAssessmentObject ReadAsPropertyName(
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
            return new RiskAssessmentObject(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            RiskAssessmentObject value,
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
        public const string RiskAssessment = "risk_assessment";
    }
}
