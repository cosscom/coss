using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(DeletedLogDrainObject.DeletedLogDrainObjectSerializer))]
[Serializable]
public readonly record struct DeletedLogDrainObject : IStringEnum
{
    public static readonly DeletedLogDrainObject LogDrain = new(Values.LogDrain);

    public DeletedLogDrainObject(string value)
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
    public static DeletedLogDrainObject FromCustom(string value)
    {
        return new DeletedLogDrainObject(value);
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

    public static bool operator ==(DeletedLogDrainObject value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(DeletedLogDrainObject value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(DeletedLogDrainObject value) => value.Value;

    public static explicit operator DeletedLogDrainObject(string value) => new(value);

    internal class DeletedLogDrainObjectSerializer : JsonConverter<DeletedLogDrainObject>
    {
        public override DeletedLogDrainObject Read(
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
            return new DeletedLogDrainObject(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            DeletedLogDrainObject value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override DeletedLogDrainObject ReadAsPropertyName(
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
            return new DeletedLogDrainObject(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            DeletedLogDrainObject value,
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
        public const string LogDrain = "log_drain";
    }
}
