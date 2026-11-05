using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss.Scheduling;

[JsonConverter(
    typeof(CreateSchedulingHolidayCalendarRequestExistingBookings.CreateSchedulingHolidayCalendarRequestExistingBookingsSerializer)
)]
[Serializable]
public readonly record struct CreateSchedulingHolidayCalendarRequestExistingBookings : IStringEnum
{
    public static readonly CreateSchedulingHolidayCalendarRequestExistingBookings Leave = new(
        Values.Leave
    );

    public static readonly CreateSchedulingHolidayCalendarRequestExistingBookings Reassign = new(
        Values.Reassign
    );

    public CreateSchedulingHolidayCalendarRequestExistingBookings(string value)
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
    public static CreateSchedulingHolidayCalendarRequestExistingBookings FromCustom(string value)
    {
        return new CreateSchedulingHolidayCalendarRequestExistingBookings(value);
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
        CreateSchedulingHolidayCalendarRequestExistingBookings value1,
        string value2
    ) => value1.Value.Equals(value2);

    public static bool operator !=(
        CreateSchedulingHolidayCalendarRequestExistingBookings value1,
        string value2
    ) => !value1.Value.Equals(value2);

    public static explicit operator string(
        CreateSchedulingHolidayCalendarRequestExistingBookings value
    ) => value.Value;

    public static explicit operator CreateSchedulingHolidayCalendarRequestExistingBookings(
        string value
    ) => new(value);

    internal class CreateSchedulingHolidayCalendarRequestExistingBookingsSerializer
        : JsonConverter<CreateSchedulingHolidayCalendarRequestExistingBookings>
    {
        public override CreateSchedulingHolidayCalendarRequestExistingBookings Read(
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
            return new CreateSchedulingHolidayCalendarRequestExistingBookings(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            CreateSchedulingHolidayCalendarRequestExistingBookings value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override CreateSchedulingHolidayCalendarRequestExistingBookings ReadAsPropertyName(
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
            return new CreateSchedulingHolidayCalendarRequestExistingBookings(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            CreateSchedulingHolidayCalendarRequestExistingBookings value,
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
