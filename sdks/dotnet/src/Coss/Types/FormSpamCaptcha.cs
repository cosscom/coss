using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(FormSpamCaptcha.FormSpamCaptchaSerializer))]
[Serializable]
public readonly record struct FormSpamCaptcha : IStringEnum
{
    public static readonly FormSpamCaptcha Off = new(Values.Off);

    public static readonly FormSpamCaptcha Required = new(Values.Required);

    public FormSpamCaptcha(string value)
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
    public static FormSpamCaptcha FromCustom(string value)
    {
        return new FormSpamCaptcha(value);
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

    public static bool operator ==(FormSpamCaptcha value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(FormSpamCaptcha value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(FormSpamCaptcha value) => value.Value;

    public static explicit operator FormSpamCaptcha(string value) => new(value);

    internal class FormSpamCaptchaSerializer : JsonConverter<FormSpamCaptcha>
    {
        public override FormSpamCaptcha Read(
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
            return new FormSpamCaptcha(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            FormSpamCaptcha value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override FormSpamCaptcha ReadAsPropertyName(
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
            return new FormSpamCaptcha(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            FormSpamCaptcha value,
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
        public const string Off = "off";

        public const string Required = "required";
    }
}
