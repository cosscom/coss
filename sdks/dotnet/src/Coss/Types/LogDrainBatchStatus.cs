using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(LogDrainBatchStatus.LogDrainBatchStatusSerializer))]
[Serializable]
public readonly record struct LogDrainBatchStatus : IStringEnum
{
    public static readonly LogDrainBatchStatus Pending = new(Values.Pending);

    public static readonly LogDrainBatchStatus Succeeded = new(Values.Succeeded);

    public static readonly LogDrainBatchStatus Failed = new(Values.Failed);

    public LogDrainBatchStatus(string value)
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
    public static LogDrainBatchStatus FromCustom(string value)
    {
        return new LogDrainBatchStatus(value);
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

    public static bool operator ==(LogDrainBatchStatus value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(LogDrainBatchStatus value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(LogDrainBatchStatus value) => value.Value;

    public static explicit operator LogDrainBatchStatus(string value) => new(value);

    internal class LogDrainBatchStatusSerializer : JsonConverter<LogDrainBatchStatus>
    {
        public override LogDrainBatchStatus Read(
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
            return new LogDrainBatchStatus(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            LogDrainBatchStatus value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override LogDrainBatchStatus ReadAsPropertyName(
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
            return new LogDrainBatchStatus(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            LogDrainBatchStatus value,
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
        public const string Pending = "pending";

        public const string Succeeded = "succeeded";

        public const string Failed = "failed";
    }
}
