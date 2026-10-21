using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(LogDrainAttemptObject.LogDrainAttemptObjectSerializer))]
[Serializable]
public readonly record struct LogDrainAttemptObject : IStringEnum
{
    public static readonly LogDrainAttemptObject LogDrainAttempt = new(Values.LogDrainAttempt);

    public LogDrainAttemptObject(string value)
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
    public static LogDrainAttemptObject FromCustom(string value)
    {
        return new LogDrainAttemptObject(value);
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

    public static bool operator ==(LogDrainAttemptObject value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(LogDrainAttemptObject value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(LogDrainAttemptObject value) => value.Value;

    public static explicit operator LogDrainAttemptObject(string value) => new(value);

    internal class LogDrainAttemptObjectSerializer : JsonConverter<LogDrainAttemptObject>
    {
        public override LogDrainAttemptObject Read(
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
            return new LogDrainAttemptObject(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            LogDrainAttemptObject value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override LogDrainAttemptObject ReadAsPropertyName(
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
            return new LogDrainAttemptObject(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            LogDrainAttemptObject value,
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
        public const string LogDrainAttempt = "log_drain_attempt";
    }
}
