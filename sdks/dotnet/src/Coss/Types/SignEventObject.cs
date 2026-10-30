using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(SignEventObject.SignEventObjectSerializer))]
[Serializable]
public readonly record struct SignEventObject : IStringEnum
{
    public static readonly SignEventObject SignEvent = new(Values.SignEvent);

    public SignEventObject(string value)
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
    public static SignEventObject FromCustom(string value)
    {
        return new SignEventObject(value);
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

    public static bool operator ==(SignEventObject value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(SignEventObject value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(SignEventObject value) => value.Value;

    public static explicit operator SignEventObject(string value) => new(value);

    internal class SignEventObjectSerializer : JsonConverter<SignEventObject>
    {
        public override SignEventObject Read(
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
            return new SignEventObject(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            SignEventObject value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override SignEventObject ReadAsPropertyName(
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
            return new SignEventObject(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            SignEventObject value,
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
        public const string SignEvent = "sign_event";
    }
}
