using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(CreateFormRequestSpamCaptcha.CreateFormRequestSpamCaptchaSerializer))]
[Serializable]
public readonly record struct CreateFormRequestSpamCaptcha : IStringEnum
{
    public static readonly CreateFormRequestSpamCaptcha Off = new(Values.Off);

    public static readonly CreateFormRequestSpamCaptcha Required = new(Values.Required);

    public CreateFormRequestSpamCaptcha(string value)
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
    public static CreateFormRequestSpamCaptcha FromCustom(string value)
    {
        return new CreateFormRequestSpamCaptcha(value);
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

    public static bool operator ==(CreateFormRequestSpamCaptcha value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(CreateFormRequestSpamCaptcha value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(CreateFormRequestSpamCaptcha value) => value.Value;

    public static explicit operator CreateFormRequestSpamCaptcha(string value) => new(value);

    internal class CreateFormRequestSpamCaptchaSerializer
        : JsonConverter<CreateFormRequestSpamCaptcha>
    {
        public override CreateFormRequestSpamCaptcha Read(
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
            return new CreateFormRequestSpamCaptcha(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            CreateFormRequestSpamCaptcha value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override CreateFormRequestSpamCaptcha ReadAsPropertyName(
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
            return new CreateFormRequestSpamCaptcha(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            CreateFormRequestSpamCaptcha value,
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
