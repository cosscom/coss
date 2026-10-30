using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(FormSubmissionObject.FormSubmissionObjectSerializer))]
[Serializable]
public readonly record struct FormSubmissionObject : IStringEnum
{
    public static readonly FormSubmissionObject FormSubmission = new(Values.FormSubmission);

    public FormSubmissionObject(string value)
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
    public static FormSubmissionObject FromCustom(string value)
    {
        return new FormSubmissionObject(value);
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

    public static bool operator ==(FormSubmissionObject value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(FormSubmissionObject value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(FormSubmissionObject value) => value.Value;

    public static explicit operator FormSubmissionObject(string value) => new(value);

    internal class FormSubmissionObjectSerializer : JsonConverter<FormSubmissionObject>
    {
        public override FormSubmissionObject Read(
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
            return new FormSubmissionObject(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            FormSubmissionObject value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override FormSubmissionObject ReadAsPropertyName(
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
            return new FormSubmissionObject(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            FormSubmissionObject value,
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
        public const string FormSubmission = "form_submission";
    }
}
