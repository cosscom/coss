using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(FormSubmissionListObject.FormSubmissionListObjectSerializer))]
[Serializable]
public readonly record struct FormSubmissionListObject : IStringEnum
{
    public static readonly FormSubmissionListObject List = new(Values.List);

    public FormSubmissionListObject(string value)
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
    public static FormSubmissionListObject FromCustom(string value)
    {
        return new FormSubmissionListObject(value);
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

    public static bool operator ==(FormSubmissionListObject value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(FormSubmissionListObject value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(FormSubmissionListObject value) => value.Value;

    public static explicit operator FormSubmissionListObject(string value) => new(value);

    internal class FormSubmissionListObjectSerializer : JsonConverter<FormSubmissionListObject>
    {
        public override FormSubmissionListObject Read(
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
            return new FormSubmissionListObject(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            FormSubmissionListObject value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override FormSubmissionListObject ReadAsPropertyName(
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
            return new FormSubmissionListObject(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            FormSubmissionListObject value,
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
        public const string List = "list";
    }
}
