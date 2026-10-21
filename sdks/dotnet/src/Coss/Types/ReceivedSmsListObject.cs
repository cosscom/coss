using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(ReceivedSmsListObject.ReceivedSmsListObjectSerializer))]
[Serializable]
public readonly record struct ReceivedSmsListObject : IStringEnum
{
    public static readonly ReceivedSmsListObject List = new(Values.List);

    public ReceivedSmsListObject(string value)
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
    public static ReceivedSmsListObject FromCustom(string value)
    {
        return new ReceivedSmsListObject(value);
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

    public static bool operator ==(ReceivedSmsListObject value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(ReceivedSmsListObject value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(ReceivedSmsListObject value) => value.Value;

    public static explicit operator ReceivedSmsListObject(string value) => new(value);

    internal class ReceivedSmsListObjectSerializer : JsonConverter<ReceivedSmsListObject>
    {
        public override ReceivedSmsListObject Read(
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
            return new ReceivedSmsListObject(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            ReceivedSmsListObject value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override ReceivedSmsListObject ReadAsPropertyName(
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
            return new ReceivedSmsListObject(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            ReceivedSmsListObject value,
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
