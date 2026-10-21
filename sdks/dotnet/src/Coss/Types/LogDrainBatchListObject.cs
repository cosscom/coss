using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(LogDrainBatchListObject.LogDrainBatchListObjectSerializer))]
[Serializable]
public readonly record struct LogDrainBatchListObject : IStringEnum
{
    public static readonly LogDrainBatchListObject List = new(Values.List);

    public LogDrainBatchListObject(string value)
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
    public static LogDrainBatchListObject FromCustom(string value)
    {
        return new LogDrainBatchListObject(value);
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

    public static bool operator ==(LogDrainBatchListObject value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(LogDrainBatchListObject value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(LogDrainBatchListObject value) => value.Value;

    public static explicit operator LogDrainBatchListObject(string value) => new(value);

    internal class LogDrainBatchListObjectSerializer : JsonConverter<LogDrainBatchListObject>
    {
        public override LogDrainBatchListObject Read(
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
            return new LogDrainBatchListObject(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            LogDrainBatchListObject value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override LogDrainBatchListObject ReadAsPropertyName(
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
            return new LogDrainBatchListObject(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            LogDrainBatchListObject value,
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
