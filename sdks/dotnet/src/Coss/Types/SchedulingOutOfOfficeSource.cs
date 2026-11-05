using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(SchedulingOutOfOfficeSource.SchedulingOutOfOfficeSourceSerializer))]
[Serializable]
public readonly record struct SchedulingOutOfOfficeSource : IStringEnum
{
    public static readonly SchedulingOutOfOfficeSource Api = new(Values.Api);

    public static readonly SchedulingOutOfOfficeSource Host = new(Values.Host);

    public static readonly SchedulingOutOfOfficeSource Manager = new(Values.Manager);

    public static readonly SchedulingOutOfOfficeSource Dashboard = new(Values.Dashboard);

    public static readonly SchedulingOutOfOfficeSource Holiday = new(Values.Holiday);

    public SchedulingOutOfOfficeSource(string value)
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
    public static SchedulingOutOfOfficeSource FromCustom(string value)
    {
        return new SchedulingOutOfOfficeSource(value);
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

    public static bool operator ==(SchedulingOutOfOfficeSource value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(SchedulingOutOfOfficeSource value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(SchedulingOutOfOfficeSource value) => value.Value;

    public static explicit operator SchedulingOutOfOfficeSource(string value) => new(value);

    internal class SchedulingOutOfOfficeSourceSerializer
        : JsonConverter<SchedulingOutOfOfficeSource>
    {
        public override SchedulingOutOfOfficeSource Read(
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
            return new SchedulingOutOfOfficeSource(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            SchedulingOutOfOfficeSource value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override SchedulingOutOfOfficeSource ReadAsPropertyName(
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
            return new SchedulingOutOfOfficeSource(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            SchedulingOutOfOfficeSource value,
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
        public const string Api = "api";

        public const string Host = "host";

        public const string Manager = "manager";

        public const string Dashboard = "dashboard";

        public const string Holiday = "holiday";
    }
}
