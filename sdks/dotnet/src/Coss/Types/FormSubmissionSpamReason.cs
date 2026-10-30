using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(FormSubmissionSpamReason.FormSubmissionSpamReasonSerializer))]
[Serializable]
public readonly record struct FormSubmissionSpamReason : IStringEnum
{
    public static readonly FormSubmissionSpamReason Honeypot = new(Values.Honeypot);

    public static readonly FormSubmissionSpamReason RiskBlock = new(Values.RiskBlock);

    public static readonly FormSubmissionSpamReason RiskReview = new(Values.RiskReview);

    public static readonly FormSubmissionSpamReason Content = new(Values.Content);

    public FormSubmissionSpamReason(string value)
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
    public static FormSubmissionSpamReason FromCustom(string value)
    {
        return new FormSubmissionSpamReason(value);
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

    public static bool operator ==(FormSubmissionSpamReason value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(FormSubmissionSpamReason value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(FormSubmissionSpamReason value) => value.Value;

    public static explicit operator FormSubmissionSpamReason(string value) => new(value);

    internal class FormSubmissionSpamReasonSerializer : JsonConverter<FormSubmissionSpamReason>
    {
        public override FormSubmissionSpamReason Read(
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
            return new FormSubmissionSpamReason(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            FormSubmissionSpamReason value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override FormSubmissionSpamReason ReadAsPropertyName(
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
            return new FormSubmissionSpamReason(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            FormSubmissionSpamReason value,
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
        public const string Honeypot = "honeypot";

        public const string RiskBlock = "risk_block";

        public const string RiskReview = "risk_review";

        public const string Content = "content";
    }
}
