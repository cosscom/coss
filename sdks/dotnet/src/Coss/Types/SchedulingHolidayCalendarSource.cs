using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(SchedulingHolidayCalendarSource.SchedulingHolidayCalendarSourceSerializer))]
[Serializable]
public readonly record struct SchedulingHolidayCalendarSource : IStringEnum
{
    public static readonly SchedulingHolidayCalendarSource Country = new(Values.Country);

    public static readonly SchedulingHolidayCalendarSource Ics = new(Values.Ics);

    public SchedulingHolidayCalendarSource(string value)
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
    public static SchedulingHolidayCalendarSource FromCustom(string value)
    {
        return new SchedulingHolidayCalendarSource(value);
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

    public static bool operator ==(SchedulingHolidayCalendarSource value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(SchedulingHolidayCalendarSource value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(SchedulingHolidayCalendarSource value) => value.Value;

    public static explicit operator SchedulingHolidayCalendarSource(string value) => new(value);

    internal class SchedulingHolidayCalendarSourceSerializer
        : JsonConverter<SchedulingHolidayCalendarSource>
    {
        public override SchedulingHolidayCalendarSource Read(
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
            return new SchedulingHolidayCalendarSource(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            SchedulingHolidayCalendarSource value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override SchedulingHolidayCalendarSource ReadAsPropertyName(
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
            return new SchedulingHolidayCalendarSource(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            SchedulingHolidayCalendarSource value,
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
        public const string Country = "country";

        public const string Ics = "ics";
    }
}
