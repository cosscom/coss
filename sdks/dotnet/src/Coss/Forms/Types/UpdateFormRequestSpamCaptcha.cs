using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(UpdateFormRequestSpamCaptcha.UpdateFormRequestSpamCaptchaSerializer))]
[Serializable]
public readonly record struct UpdateFormRequestSpamCaptcha : IStringEnum
{
    public static readonly UpdateFormRequestSpamCaptcha Off = new(Values.Off);

    public static readonly UpdateFormRequestSpamCaptcha Required = new(Values.Required);

    public UpdateFormRequestSpamCaptcha(string value)
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
    public static UpdateFormRequestSpamCaptcha FromCustom(string value)
    {
        return new UpdateFormRequestSpamCaptcha(value);
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

    public static bool operator ==(UpdateFormRequestSpamCaptcha value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(UpdateFormRequestSpamCaptcha value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(UpdateFormRequestSpamCaptcha value) => value.Value;

    public static explicit operator UpdateFormRequestSpamCaptcha(string value) => new(value);

    internal class UpdateFormRequestSpamCaptchaSerializer
        : JsonConverter<UpdateFormRequestSpamCaptcha>
    {
        public override UpdateFormRequestSpamCaptcha Read(
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
            return new UpdateFormRequestSpamCaptcha(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            UpdateFormRequestSpamCaptcha value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override UpdateFormRequestSpamCaptcha ReadAsPropertyName(
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
            return new UpdateFormRequestSpamCaptcha(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            UpdateFormRequestSpamCaptcha value,
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
