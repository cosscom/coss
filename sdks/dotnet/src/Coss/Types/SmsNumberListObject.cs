using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(SmsNumberListObject.SmsNumberListObjectSerializer))]
[Serializable]
public readonly record struct SmsNumberListObject : IStringEnum
{
    public static readonly SmsNumberListObject List = new(Values.List);

    public SmsNumberListObject(string value)
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
    public static SmsNumberListObject FromCustom(string value)
    {
        return new SmsNumberListObject(value);
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

    public static bool operator ==(SmsNumberListObject value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(SmsNumberListObject value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(SmsNumberListObject value) => value.Value;

    public static explicit operator SmsNumberListObject(string value) => new(value);

    internal class SmsNumberListObjectSerializer : JsonConverter<SmsNumberListObject>
    {
        public override SmsNumberListObject Read(
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
            return new SmsNumberListObject(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            SmsNumberListObject value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override SmsNumberListObject ReadAsPropertyName(
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
            return new SmsNumberListObject(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            SmsNumberListObject value,
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
