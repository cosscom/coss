using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(SignFieldInputAnchorType.SignFieldInputAnchorTypeSerializer))]
[Serializable]
public readonly record struct SignFieldInputAnchorType : IStringEnum
{
    public static readonly SignFieldInputAnchorType Signature = new(Values.Signature);

    public static readonly SignFieldInputAnchorType Initials = new(Values.Initials);

    public static readonly SignFieldInputAnchorType DateSigned = new(Values.DateSigned);

    public static readonly SignFieldInputAnchorType Name = new(Values.Name);

    public static readonly SignFieldInputAnchorType Email = new(Values.Email);

    public static readonly SignFieldInputAnchorType Text = new(Values.Text);

    public static readonly SignFieldInputAnchorType Checkbox = new(Values.Checkbox);

    public SignFieldInputAnchorType(string value)
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
    public static SignFieldInputAnchorType FromCustom(string value)
    {
        return new SignFieldInputAnchorType(value);
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

    public static bool operator ==(SignFieldInputAnchorType value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(SignFieldInputAnchorType value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(SignFieldInputAnchorType value) => value.Value;

    public static explicit operator SignFieldInputAnchorType(string value) => new(value);

    internal class SignFieldInputAnchorTypeSerializer : JsonConverter<SignFieldInputAnchorType>
    {
        public override SignFieldInputAnchorType Read(
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
            return new SignFieldInputAnchorType(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            SignFieldInputAnchorType value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override SignFieldInputAnchorType ReadAsPropertyName(
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
            return new SignFieldInputAnchorType(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            SignFieldInputAnchorType value,
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
