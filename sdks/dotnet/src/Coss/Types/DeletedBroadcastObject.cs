using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(DeletedBroadcastObject.DeletedBroadcastObjectSerializer))]
[Serializable]
public readonly record struct DeletedBroadcastObject : IStringEnum
{
    public static readonly DeletedBroadcastObject Broadcast = new(Values.Broadcast);

    public DeletedBroadcastObject(string value)
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
    public static DeletedBroadcastObject FromCustom(string value)
    {
        return new DeletedBroadcastObject(value);
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

    public static bool operator ==(DeletedBroadcastObject value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(DeletedBroadcastObject value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(DeletedBroadcastObject value) => value.Value;

    public static explicit operator DeletedBroadcastObject(string value) => new(value);

    internal class DeletedBroadcastObjectSerializer : JsonConverter<DeletedBroadcastObject>
    {
        public override DeletedBroadcastObject Read(
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
            return new DeletedBroadcastObject(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            DeletedBroadcastObject value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override DeletedBroadcastObject ReadAsPropertyName(
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
            return new DeletedBroadcastObject(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            DeletedBroadcastObject value,
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
