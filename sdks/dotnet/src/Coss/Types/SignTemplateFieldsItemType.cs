using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(SignTemplateFieldsItemType.SignTemplateFieldsItemTypeSerializer))]
[Serializable]
public readonly record struct SignTemplateFieldsItemType : IStringEnum
{
    public static readonly SignTemplateFieldsItemType Signature = new(Values.Signature);

    public static readonly SignTemplateFieldsItemType Initials = new(Values.Initials);

    public static readonly SignTemplateFieldsItemType DateSigned = new(Values.DateSigned);

    public static readonly SignTemplateFieldsItemType Name = new(Values.Name);

    public static readonly SignTemplateFieldsItemType Email = new(Values.Email);

    public static readonly SignTemplateFieldsItemType Text = new(Values.Text);

    public static readonly SignTemplateFieldsItemType Checkbox = new(Values.Checkbox);

    public SignTemplateFieldsItemType(string value)
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
    public static SignTemplateFieldsItemType FromCustom(string value)
    {
        return new SignTemplateFieldsItemType(value);
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

    public static bool operator ==(SignTemplateFieldsItemType value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(SignTemplateFieldsItemType value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(SignTemplateFieldsItemType value) => value.Value;

    public static explicit operator SignTemplateFieldsItemType(string value) => new(value);

    internal class SignTemplateFieldsItemTypeSerializer : JsonConverter<SignTemplateFieldsItemType>
    {
        public override SignTemplateFieldsItemType Read(
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
            return new SignTemplateFieldsItemType(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            SignTemplateFieldsItemType value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override SignTemplateFieldsItemType ReadAsPropertyName(
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
            return new SignTemplateFieldsItemType(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            SignTemplateFieldsItemType value,
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
        public const string Signature = "signature";

        public const string Initials = "initials";

        public const string DateSigned = "date_signed";

        public const string Name = "name";

        public const string Email = "email";

        public const string Text = "text";

        public const string Checkbox = "checkbox";
    }
}
