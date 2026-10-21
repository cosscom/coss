using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(LogLevel.LogLevelSerializer))]
[Serializable]
public readonly record struct LogLevel : IStringEnum
{
    public static readonly LogLevel Info = new(Values.Info);

    public static readonly LogLevel Warning = new(Values.Warning);

    public static readonly LogLevel Error = new(Values.Error);

    public LogLevel(string value)
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
    public static LogLevel FromCustom(string value)
    {
        return new LogLevel(value);
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

    public static bool operator ==(LogLevel value1, string value2) => value1.Value.Equals(value2);

    public static bool operator !=(LogLevel value1, string value2) => !value1.Value.Equals(value2);

    public static explicit operator string(LogLevel value) => value.Value;

    public static explicit operator LogLevel(string value) => new(value);

    internal class LogLevelSerializer : JsonConverter<LogLevel>
    {
        public override LogLevel Read(
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
            return new LogLevel(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            LogLevel value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override LogLevel ReadAsPropertyName(
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
            return new LogLevel(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            LogLevel value,
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
        public const string Info = "info";

        public const string Warning = "warning";

        public const string Error = "error";
    }
}
