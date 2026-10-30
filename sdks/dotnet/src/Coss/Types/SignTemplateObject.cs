using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(SignTemplateObject.SignTemplateObjectSerializer))]
[Serializable]
public readonly record struct SignTemplateObject : IStringEnum
{
    public static readonly SignTemplateObject SignTemplate = new(Values.SignTemplate);

    public SignTemplateObject(string value)
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
    public static SignTemplateObject FromCustom(string value)
    {
        return new SignTemplateObject(value);
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

    public static bool operator ==(SignTemplateObject value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(SignTemplateObject value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(SignTemplateObject value) => value.Value;

    public static explicit operator SignTemplateObject(string value) => new(value);

    internal class SignTemplateObjectSerializer : JsonConverter<SignTemplateObject>
    {
        public override SignTemplateObject Read(
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
            return new SignTemplateObject(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            SignTemplateObject value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override SignTemplateObject ReadAsPropertyName(
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
            return new SignTemplateObject(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            SignTemplateObject value,
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
        public const string SignTemplate = "sign_template";
    }
}
