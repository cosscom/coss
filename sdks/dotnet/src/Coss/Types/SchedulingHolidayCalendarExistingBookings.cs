using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(
    typeof(SchedulingHolidayCalendarExistingBookings.SchedulingHolidayCalendarExistingBookingsSerializer)
)]
[Serializable]
public readonly record struct SchedulingHolidayCalendarExistingBookings : IStringEnum
{
    public static readonly SchedulingHolidayCalendarExistingBookings Leave = new(Values.Leave);

    public static readonly SchedulingHolidayCalendarExistingBookings Reassign = new(
        Values.Reassign
    );

    public SchedulingHolidayCalendarExistingBookings(string value)
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
    public static SchedulingHolidayCalendarExistingBookings FromCustom(string value)
    {
        return new SchedulingHolidayCalendarExistingBookings(value);
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

    public static bool operator ==(
        SchedulingHolidayCalendarExistingBookings value1,
        string value2
    ) => value1.Value.Equals(value2);

    public static bool operator !=(
        SchedulingHolidayCalendarExistingBookings value1,
        string value2
    ) => !value1.Value.Equals(value2);

    public static explicit operator string(SchedulingHolidayCalendarExistingBookings value) =>
        value.Value;

    public static explicit operator SchedulingHolidayCalendarExistingBookings(string value) =>
        new(value);

    internal class SchedulingHolidayCalendarExistingBookingsSerializer
        : JsonConverter<SchedulingHolidayCalendarExistingBookings>
    {
        public override SchedulingHolidayCalendarExistingBookings Read(
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
            return new SchedulingHolidayCalendarExistingBookings(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            SchedulingHolidayCalendarExistingBookings value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override SchedulingHolidayCalendarExistingBookings ReadAsPropertyName(
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
            return new SchedulingHolidayCalendarExistingBookings(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            SchedulingHolidayCalendarExistingBookings value,
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
        public const string Leave = "leave";

        public const string Reassign = "reassign";
    }
}
