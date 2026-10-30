using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(SignBuilderSessionObject.SignBuilderSessionObjectSerializer))]
[Serializable]
public readonly record struct SignBuilderSessionObject : IStringEnum
{
    public static readonly SignBuilderSessionObject SignBuilderSession = new(
        Values.SignBuilderSession
    );

    public SignBuilderSessionObject(string value)
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
    public static SignBuilderSessionObject FromCustom(string value)
    {
        return new SignBuilderSessionObject(value);
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

    public static bool operator ==(SignBuilderSessionObject value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(SignBuilderSessionObject value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(SignBuilderSessionObject value) => value.Value;

    public static explicit operator SignBuilderSessionObject(string value) => new(value);

    internal class SignBuilderSessionObjectSerializer : JsonConverter<SignBuilderSessionObject>
    {
        public override SignBuilderSessionObject Read(
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
            return new SignBuilderSessionObject(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            SignBuilderSessionObject value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override SignBuilderSessionObject ReadAsPropertyName(
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
            return new SignBuilderSessionObject(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            SignBuilderSessionObject value,
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
        public const string SignBuilderSession = "sign_builder_session";
    }
}
