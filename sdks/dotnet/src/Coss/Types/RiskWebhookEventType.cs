using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(RiskWebhookEventType.RiskWebhookEventTypeSerializer))]
[Serializable]
public readonly record struct RiskWebhookEventType : IStringEnum
{
    public static readonly RiskWebhookEventType RiskAssessmentReview = new(
        Values.RiskAssessmentReview
    );

    public static readonly RiskWebhookEventType RiskAssessmentReviewed = new(
        Values.RiskAssessmentReviewed
    );

    public RiskWebhookEventType(string value)
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
    public static RiskWebhookEventType FromCustom(string value)
    {
        return new RiskWebhookEventType(value);
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

    public static bool operator ==(RiskWebhookEventType value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(RiskWebhookEventType value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(RiskWebhookEventType value) => value.Value;

    public static explicit operator RiskWebhookEventType(string value) => new(value);

    internal class RiskWebhookEventTypeSerializer : JsonConverter<RiskWebhookEventType>
    {
        public override RiskWebhookEventType Read(
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
            return new RiskWebhookEventType(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            RiskWebhookEventType value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override RiskWebhookEventType ReadAsPropertyName(
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
            return new RiskWebhookEventType(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            RiskWebhookEventType value,
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
        public const string RiskAssessmentReview = "risk.assessment.review";

        public const string RiskAssessmentReviewed = "risk.assessment.reviewed";
    }
}
