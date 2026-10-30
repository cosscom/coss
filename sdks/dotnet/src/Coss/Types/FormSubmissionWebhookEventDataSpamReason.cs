using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(
    typeof(FormSubmissionWebhookEventDataSpamReason.FormSubmissionWebhookEventDataSpamReasonSerializer)
)]
[Serializable]
public readonly record struct FormSubmissionWebhookEventDataSpamReason : IStringEnum
{
    public static readonly FormSubmissionWebhookEventDataSpamReason Honeypot = new(Values.Honeypot);

    public static readonly FormSubmissionWebhookEventDataSpamReason RiskBlock = new(
        Values.RiskBlock
    );

    public static readonly FormSubmissionWebhookEventDataSpamReason RiskReview = new(
        Values.RiskReview
    );

    public static readonly FormSubmissionWebhookEventDataSpamReason Content = new(Values.Content);

    public FormSubmissionWebhookEventDataSpamReason(string value)
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
    public static FormSubmissionWebhookEventDataSpamReason FromCustom(string value)
    {
        return new FormSubmissionWebhookEventDataSpamReason(value);
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

    public static bool operator ==(
        FormSubmissionWebhookEventDataSpamReason value1,
        string value2
    ) => value1.Value.Equals(value2);

    public static bool operator !=(
        FormSubmissionWebhookEventDataSpamReason value1,
        string value2
    ) => !value1.Value.Equals(value2);

    public static explicit operator string(FormSubmissionWebhookEventDataSpamReason value) =>
        value.Value;

    public static explicit operator FormSubmissionWebhookEventDataSpamReason(string value) =>
        new(value);

    internal class FormSubmissionWebhookEventDataSpamReasonSerializer
        : JsonConverter<FormSubmissionWebhookEventDataSpamReason>
    {
        public override FormSubmissionWebhookEventDataSpamReason Read(
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
            return new FormSubmissionWebhookEventDataSpamReason(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            FormSubmissionWebhookEventDataSpamReason value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override FormSubmissionWebhookEventDataSpamReason ReadAsPropertyName(
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
            return new FormSubmissionWebhookEventDataSpamReason(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            FormSubmissionWebhookEventDataSpamReason value,
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
