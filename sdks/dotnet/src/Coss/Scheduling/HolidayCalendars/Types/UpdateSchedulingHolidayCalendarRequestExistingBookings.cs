using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss.Scheduling;

[JsonConverter(
    typeof(UpdateSchedulingHolidayCalendarRequestExistingBookings.UpdateSchedulingHolidayCalendarRequestExistingBookingsSerializer)
)]
[Serializable]
public readonly record struct UpdateSchedulingHolidayCalendarRequestExistingBookings : IStringEnum
{
    public static readonly UpdateSchedulingHolidayCalendarRequestExistingBookings Leave = new(
        Values.Leave
    );

    public static readonly UpdateSchedulingHolidayCalendarRequestExistingBookings Reassign = new(
        Values.Reassign
    );

    public UpdateSchedulingHolidayCalendarRequestExistingBookings(string value)
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
    public static UpdateSchedulingHolidayCalendarRequestExistingBookings FromCustom(string value)
    {
        return new UpdateSchedulingHolidayCalendarRequestExistingBookings(value);
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
        UpdateSchedulingHolidayCalendarRequestExistingBookings value1,
        string value2
    ) => value1.Value.Equals(value2);

    public static bool operator !=(
        UpdateSchedulingHolidayCalendarRequestExistingBookings value1,
        string value2
    ) => !value1.Value.Equals(value2);

    public static explicit operator string(
        UpdateSchedulingHolidayCalendarRequestExistingBookings value
    ) => value.Value;

    public static explicit operator UpdateSchedulingHolidayCalendarRequestExistingBookings(
        string value
    ) => new(value);

    internal class UpdateSchedulingHolidayCalendarRequestExistingBookingsSerializer
        : JsonConverter<UpdateSchedulingHolidayCalendarRequestExistingBookings>
    {
        public override UpdateSchedulingHolidayCalendarRequestExistingBookings Read(
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
            return new UpdateSchedulingHolidayCalendarRequestExistingBookings(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            UpdateSchedulingHolidayCalendarRequestExistingBookings value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override UpdateSchedulingHolidayCalendarRequestExistingBookings ReadAsPropertyName(
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
            return new UpdateSchedulingHolidayCalendarRequestExistingBookings(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            UpdateSchedulingHolidayCalendarRequestExistingBookings value,
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
