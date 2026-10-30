using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(SignFieldInputDocumentType.SignFieldInputDocumentTypeSerializer))]
[Serializable]
public readonly record struct SignFieldInputDocumentType : IStringEnum
{
    public static readonly SignFieldInputDocumentType Signature = new(Values.Signature);

    public static readonly SignFieldInputDocumentType Initials = new(Values.Initials);

    public static readonly SignFieldInputDocumentType DateSigned = new(Values.DateSigned);

    public static readonly SignFieldInputDocumentType Name = new(Values.Name);

    public static readonly SignFieldInputDocumentType Email = new(Values.Email);

    public static readonly SignFieldInputDocumentType Text = new(Values.Text);

    public static readonly SignFieldInputDocumentType Checkbox = new(Values.Checkbox);

    public SignFieldInputDocumentType(string value)
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
    public static SignFieldInputDocumentType FromCustom(string value)
    {
        return new SignFieldInputDocumentType(value);
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

    public static bool operator ==(SignFieldInputDocumentType value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(SignFieldInputDocumentType value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(SignFieldInputDocumentType value) => value.Value;

    public static explicit operator SignFieldInputDocumentType(string value) => new(value);

    internal class SignFieldInputDocumentTypeSerializer : JsonConverter<SignFieldInputDocumentType>
    {
        public override SignFieldInputDocumentType Read(
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
            return new SignFieldInputDocumentType(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            SignFieldInputDocumentType value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override SignFieldInputDocumentType ReadAsPropertyName(
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
            return new SignFieldInputDocumentType(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            SignFieldInputDocumentType value,
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
