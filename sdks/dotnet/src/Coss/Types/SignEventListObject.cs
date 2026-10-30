using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(SignEventListObject.SignEventListObjectSerializer))]
[Serializable]
public readonly record struct SignEventListObject : IStringEnum
{
    public static readonly SignEventListObject List = new(Values.List);

    public SignEventListObject(string value)
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
    public static SignEventListObject FromCustom(string value)
    {
        return new SignEventListObject(value);
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

    public static bool operator ==(SignEventListObject value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(SignEventListObject value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(SignEventListObject value) => value.Value;

    public static explicit operator SignEventListObject(string value) => new(value);

    internal class SignEventListObjectSerializer : JsonConverter<SignEventListObject>
    {
        public override SignEventListObject Read(
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
            return new SignEventListObject(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            SignEventListObject value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override SignEventListObject ReadAsPropertyName(
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
            return new SignEventListObject(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            SignEventListObject value,
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
        public const string List = "list";
    }
}
