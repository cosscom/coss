using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(FormSubmissionRiskDecision.FormSubmissionRiskDecisionSerializer))]
[Serializable]
public readonly record struct FormSubmissionRiskDecision : IStringEnum
{
    public static readonly FormSubmissionRiskDecision Allow = new(Values.Allow);

    public static readonly FormSubmissionRiskDecision Review = new(Values.Review);

    public static readonly FormSubmissionRiskDecision Block = new(Values.Block);

    public FormSubmissionRiskDecision(string value)
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
    public static FormSubmissionRiskDecision FromCustom(string value)
    {
        return new FormSubmissionRiskDecision(value);
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

    public static bool operator ==(FormSubmissionRiskDecision value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(FormSubmissionRiskDecision value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(FormSubmissionRiskDecision value) => value.Value;

    public static explicit operator FormSubmissionRiskDecision(string value) => new(value);

    internal class FormSubmissionRiskDecisionSerializer : JsonConverter<FormSubmissionRiskDecision>
    {
        public override FormSubmissionRiskDecision Read(
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
            return new FormSubmissionRiskDecision(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            FormSubmissionRiskDecision value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override FormSubmissionRiskDecision ReadAsPropertyName(
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
            return new FormSubmissionRiskDecision(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            FormSubmissionRiskDecision value,
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
