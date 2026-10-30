using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(FormSubmissionStatus.FormSubmissionStatusSerializer))]
[Serializable]
public readonly record struct FormSubmissionStatus : IStringEnum
{
    public static readonly FormSubmissionStatus PendingConfirmation = new(
        Values.PendingConfirmation
    );

    public static readonly FormSubmissionStatus Accepted = new(Values.Accepted);

    public static readonly FormSubmissionStatus Held = new(Values.Held);

    public static readonly FormSubmissionStatus Spam = new(Values.Spam);

    public FormSubmissionStatus(string value)
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
    public static FormSubmissionStatus FromCustom(string value)
    {
        return new FormSubmissionStatus(value);
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

    public static bool operator ==(FormSubmissionStatus value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(FormSubmissionStatus value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(FormSubmissionStatus value) => value.Value;

    public static explicit operator FormSubmissionStatus(string value) => new(value);

    internal class FormSubmissionStatusSerializer : JsonConverter<FormSubmissionStatus>
    {
        public override FormSubmissionStatus Read(
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
            return new FormSubmissionStatus(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            FormSubmissionStatus value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override FormSubmissionStatus ReadAsPropertyName(
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
            return new FormSubmissionStatus(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            FormSubmissionStatus value,
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
        public const string PendingConfirmation = "pending_confirmation";

        public const string Accepted = "accepted";

        public const string Held = "held";

        public const string Spam = "spam";
    }
}
