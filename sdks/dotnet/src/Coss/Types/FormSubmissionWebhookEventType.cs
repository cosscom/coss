using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(FormSubmissionWebhookEventType.FormSubmissionWebhookEventTypeSerializer))]
[Serializable]
public readonly record struct FormSubmissionWebhookEventType : IStringEnum
{
    public static readonly FormSubmissionWebhookEventType FormSubmissionReceived = new(
        Values.FormSubmissionReceived
    );

    public static readonly FormSubmissionWebhookEventType FormSubmissionFlagged = new(
        Values.FormSubmissionFlagged
    );

    public FormSubmissionWebhookEventType(string value)
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
    public static FormSubmissionWebhookEventType FromCustom(string value)
    {
        return new FormSubmissionWebhookEventType(value);
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

    public static bool operator ==(FormSubmissionWebhookEventType value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(FormSubmissionWebhookEventType value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(FormSubmissionWebhookEventType value) => value.Value;

    public static explicit operator FormSubmissionWebhookEventType(string value) => new(value);

    internal class FormSubmissionWebhookEventTypeSerializer
        : JsonConverter<FormSubmissionWebhookEventType>
    {
        public override FormSubmissionWebhookEventType Read(
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
            return new FormSubmissionWebhookEventType(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            FormSubmissionWebhookEventType value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override FormSubmissionWebhookEventType ReadAsPropertyName(
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
            return new FormSubmissionWebhookEventType(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            FormSubmissionWebhookEventType value,
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
        public const string FormSubmissionReceived = "form.submission.received";

        public const string FormSubmissionFlagged = "form.submission.flagged";
    }
}
