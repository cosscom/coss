using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(SignRequestObject.SignRequestObjectSerializer))]
[Serializable]
public readonly record struct SignRequestObject : IStringEnum
{
    public static readonly SignRequestObject SignRequest = new(Values.SignRequest);

    public SignRequestObject(string value)
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
    public static SignRequestObject FromCustom(string value)
    {
        return new SignRequestObject(value);
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

    public static bool operator ==(SignRequestObject value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(SignRequestObject value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(SignRequestObject value) => value.Value;

    public static explicit operator SignRequestObject(string value) => new(value);

    internal class SignRequestObjectSerializer : JsonConverter<SignRequestObject>
    {
        public override SignRequestObject Read(
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
            return new SignRequestObject(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            SignRequestObject value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override SignRequestObject ReadAsPropertyName(
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
            return new SignRequestObject(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            SignRequestObject value,
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
        public const string SignRequest = "sign_request";
    }
}
