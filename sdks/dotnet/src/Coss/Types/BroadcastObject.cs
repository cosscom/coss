using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(BroadcastObject.BroadcastObjectSerializer))]
[Serializable]
public readonly record struct BroadcastObject : IStringEnum
{
    public static readonly BroadcastObject Broadcast = new(Values.Broadcast);

    public BroadcastObject(string value)
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
    public static BroadcastObject FromCustom(string value)
    {
        return new BroadcastObject(value);
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

    public static bool operator ==(BroadcastObject value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(BroadcastObject value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(BroadcastObject value) => value.Value;

    public static explicit operator BroadcastObject(string value) => new(value);

    internal class BroadcastObjectSerializer : JsonConverter<BroadcastObject>
    {
        public override BroadcastObject Read(
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
            return new BroadcastObject(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            BroadcastObject value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override BroadcastObject ReadAsPropertyName(
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
            return new BroadcastObject(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            BroadcastObject value,
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
        public const string Broadcast = "broadcast";
    }
}
