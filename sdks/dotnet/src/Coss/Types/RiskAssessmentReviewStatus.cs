using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(RiskAssessmentReviewStatus.RiskAssessmentReviewStatusSerializer))]
[Serializable]
public readonly record struct RiskAssessmentReviewStatus : IStringEnum
{
    public static readonly RiskAssessmentReviewStatus Open = new(Values.Open);

    public static readonly RiskAssessmentReviewStatus Resolved = new(Values.Resolved);

    public RiskAssessmentReviewStatus(string value)
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
    public static RiskAssessmentReviewStatus FromCustom(string value)
    {
        return new RiskAssessmentReviewStatus(value);
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

    public static bool operator ==(RiskAssessmentReviewStatus value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(RiskAssessmentReviewStatus value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(RiskAssessmentReviewStatus value) => value.Value;

    public static explicit operator RiskAssessmentReviewStatus(string value) => new(value);

    internal class RiskAssessmentReviewStatusSerializer : JsonConverter<RiskAssessmentReviewStatus>
    {
        public override RiskAssessmentReviewStatus Read(
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
            return new RiskAssessmentReviewStatus(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            RiskAssessmentReviewStatus value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override RiskAssessmentReviewStatus ReadAsPropertyName(
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
            return new RiskAssessmentReviewStatus(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            RiskAssessmentReviewStatus value,
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

        public const string Resolved = "resolved";
    }
}
