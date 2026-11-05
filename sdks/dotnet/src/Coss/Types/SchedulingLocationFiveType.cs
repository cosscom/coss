using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(SchedulingLocationFiveType.SchedulingLocationFiveTypeSerializer))]
[Serializable]
public readonly record struct SchedulingLocationFiveType : IStringEnum
{
    public static readonly SchedulingLocationFiveType Zoom = new(Values.Zoom);

    public SchedulingLocationFiveType(string value)
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
    public static SchedulingLocationFiveType FromCustom(string value)
    {
        return new SchedulingLocationFiveType(value);
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

    public static bool operator ==(SchedulingLocationFiveType value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(SchedulingLocationFiveType value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(SchedulingLocationFiveType value) => value.Value;

    public static explicit operator SchedulingLocationFiveType(string value) => new(value);

    internal class SchedulingLocationFiveTypeSerializer : JsonConverter<SchedulingLocationFiveType>
    {
        public override SchedulingLocationFiveType Read(
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
            return new SchedulingLocationFiveType(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            SchedulingLocationFiveType value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override SchedulingLocationFiveType ReadAsPropertyName(
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
            return new SchedulingLocationFiveType(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            SchedulingLocationFiveType value,
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
        public const string Zoom = "zoom";
    }
}
