using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(BroadcastListObject.BroadcastListObjectSerializer))]
[Serializable]
public readonly record struct BroadcastListObject : IStringEnum
{
    public static readonly BroadcastListObject List = new(Values.List);

    public BroadcastListObject(string value)
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
    public static BroadcastListObject FromCustom(string value)
    {
        return new BroadcastListObject(value);
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

    public static bool operator ==(BroadcastListObject value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(BroadcastListObject value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(BroadcastListObject value) => value.Value;

    public static explicit operator BroadcastListObject(string value) => new(value);

    internal class BroadcastListObjectSerializer : JsonConverter<BroadcastListObject>
    {
        public override BroadcastListObject Read(
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
            return new BroadcastListObject(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            BroadcastListObject value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override BroadcastListObject ReadAsPropertyName(
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
            return new BroadcastListObject(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            BroadcastListObject value,
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
