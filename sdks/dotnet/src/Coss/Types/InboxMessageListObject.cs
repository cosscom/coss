using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(InboxMessageListObject.InboxMessageListObjectSerializer))]
[Serializable]
public readonly record struct InboxMessageListObject : IStringEnum
{
    public static readonly InboxMessageListObject List = new(Values.List);

    public InboxMessageListObject(string value)
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
    public static InboxMessageListObject FromCustom(string value)
    {
        return new InboxMessageListObject(value);
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

    public static bool operator ==(InboxMessageListObject value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(InboxMessageListObject value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(InboxMessageListObject value) => value.Value;

    public static explicit operator InboxMessageListObject(string value) => new(value);

    internal class InboxMessageListObjectSerializer : JsonConverter<InboxMessageListObject>
    {
        public override InboxMessageListObject Read(
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
            return new InboxMessageListObject(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            InboxMessageListObject value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override InboxMessageListObject ReadAsPropertyName(
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
            return new InboxMessageListObject(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            InboxMessageListObject value,
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
