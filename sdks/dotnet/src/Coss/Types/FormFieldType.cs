using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(FormFieldType.FormFieldTypeSerializer))]
[Serializable]
public readonly record struct FormFieldType : IStringEnum
{
    public static readonly FormFieldType Text = new(Values.Text);

    public static readonly FormFieldType Email = new(Values.Email);

    public static readonly FormFieldType Textarea = new(Values.Textarea);

    public static readonly FormFieldType Number = new(Values.Number);

    public static readonly FormFieldType Tel = new(Values.Tel);

    public static readonly FormFieldType Url = new(Values.Url);

    public static readonly FormFieldType Date = new(Values.Date);

    public static readonly FormFieldType Select = new(Values.Select);

    public static readonly FormFieldType Radio = new(Values.Radio);

    public static readonly FormFieldType Checkbox = new(Values.Checkbox);

    public static readonly FormFieldType Hidden = new(Values.Hidden);

    public static readonly FormFieldType File = new(Values.File);

    public FormFieldType(string value)
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
    public static FormFieldType FromCustom(string value)
    {
        return new FormFieldType(value);
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

    public static bool operator ==(FormFieldType value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(FormFieldType value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(FormFieldType value) => value.Value;

    public static explicit operator FormFieldType(string value) => new(value);

    internal class FormFieldTypeSerializer : JsonConverter<FormFieldType>
    {
        public override FormFieldType Read(
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
            return new FormFieldType(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            FormFieldType value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override FormFieldType ReadAsPropertyName(
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
            return new FormFieldType(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            FormFieldType value,
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
        public const string Text = "text";

        public const string Email = "email";

        public const string Textarea = "textarea";

        public const string Number = "number";

        public const string Tel = "tel";

        public const string Url = "url";

        public const string Date = "date";

        public const string Select = "select";

        public const string Radio = "radio";

        public const string Checkbox = "checkbox";

        public const string Hidden = "hidden";

        public const string File = "file";
    }
}
