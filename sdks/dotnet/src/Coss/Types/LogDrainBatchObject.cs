using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(LogDrainBatchObject.LogDrainBatchObjectSerializer))]
[Serializable]
public readonly record struct LogDrainBatchObject : IStringEnum
{
    public static readonly LogDrainBatchObject LogDrainBatch = new(Values.LogDrainBatch);

    public LogDrainBatchObject(string value)
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
    public static LogDrainBatchObject FromCustom(string value)
    {
        return new LogDrainBatchObject(value);
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

    public static bool operator ==(LogDrainBatchObject value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(LogDrainBatchObject value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(LogDrainBatchObject value) => value.Value;

    public static explicit operator LogDrainBatchObject(string value) => new(value);

    internal class LogDrainBatchObjectSerializer : JsonConverter<LogDrainBatchObject>
    {
        public override LogDrainBatchObject Read(
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
            return new LogDrainBatchObject(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            LogDrainBatchObject value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override LogDrainBatchObject ReadAsPropertyName(
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
            return new LogDrainBatchObject(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            LogDrainBatchObject value,
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
        public const string LogDrainBatch = "log_drain_batch";
    }
}
