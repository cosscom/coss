using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(FormFieldInputType.FormFieldInputTypeSerializer))]
[Serializable]
public readonly record struct FormFieldInputType : IStringEnum
{
    public static readonly FormFieldInputType Text = new(Values.Text);

    public static readonly FormFieldInputType Email = new(Values.Email);

    public static readonly FormFieldInputType Textarea = new(Values.Textarea);

    public static readonly FormFieldInputType Number = new(Values.Number);

    public static readonly FormFieldInputType Tel = new(Values.Tel);

    public static readonly FormFieldInputType Url = new(Values.Url);

    public static readonly FormFieldInputType Date = new(Values.Date);

    public static readonly FormFieldInputType Select = new(Values.Select);

    public static readonly FormFieldInputType Radio = new(Values.Radio);

    public static readonly FormFieldInputType Checkbox = new(Values.Checkbox);

    public static readonly FormFieldInputType Hidden = new(Values.Hidden);

    public static readonly FormFieldInputType File = new(Values.File);

    public FormFieldInputType(string value)
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
    public static FormFieldInputType FromCustom(string value)
    {
        return new FormFieldInputType(value);
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

    public static bool operator ==(FormFieldInputType value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(FormFieldInputType value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(FormFieldInputType value) => value.Value;

    public static explicit operator FormFieldInputType(string value) => new(value);

    internal class FormFieldInputTypeSerializer : JsonConverter<FormFieldInputType>
    {
        public override FormFieldInputType Read(
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
            return new FormFieldInputType(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            FormFieldInputType value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override FormFieldInputType ReadAsPropertyName(
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
            return new FormFieldInputType(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            FormFieldInputType value,
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
