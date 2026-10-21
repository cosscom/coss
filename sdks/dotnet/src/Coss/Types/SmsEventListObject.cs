using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(SmsEventListObject.SmsEventListObjectSerializer))]
[Serializable]
public readonly record struct SmsEventListObject : IStringEnum
{
    public static readonly SmsEventListObject List = new(Values.List);

    public SmsEventListObject(string value)
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
    public static SmsEventListObject FromCustom(string value)
    {
        return new SmsEventListObject(value);
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

    public static bool operator ==(SmsEventListObject value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(SmsEventListObject value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(SmsEventListObject value) => value.Value;

    public static explicit operator SmsEventListObject(string value) => new(value);

    internal class SmsEventListObjectSerializer : JsonConverter<SmsEventListObject>
    {
        public override SmsEventListObject Read(
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
            return new SmsEventListObject(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            SmsEventListObject value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override SmsEventListObject ReadAsPropertyName(
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
            return new SmsEventListObject(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            SmsEventListObject value,
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
