using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss.Scheduling;

[JsonConverter(
    typeof(ReassignSchedulingBookingRequestOverridesItem.ReassignSchedulingBookingRequestOverridesItemSerializer)
)]
[Serializable]
public readonly record struct ReassignSchedulingBookingRequestOverridesItem : IStringEnum
{
    public static readonly ReassignSchedulingBookingRequestOverridesItem AnyHost = new(
        Values.AnyHost
    );

    public static readonly ReassignSchedulingBookingRequestOverridesItem OutOfOffice = new(
        Values.OutOfOffice
    );

    public static readonly ReassignSchedulingBookingRequestOverridesItem OutsideAvailability = new(
        Values.OutsideAvailability
    );

    public static readonly ReassignSchedulingBookingRequestOverridesItem HostBusy = new(
        Values.HostBusy
    );

    public static readonly ReassignSchedulingBookingRequestOverridesItem LimitReached = new(
        Values.LimitReached
    );

    public static readonly ReassignSchedulingBookingRequestOverridesItem CalendarUnverified = new(
        Values.CalendarUnverified
    );

    public ReassignSchedulingBookingRequestOverridesItem(string value)
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
    public static ReassignSchedulingBookingRequestOverridesItem FromCustom(string value)
    {
        return new ReassignSchedulingBookingRequestOverridesItem(value);
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
        ReassignSchedulingBookingRequestOverridesItem value1,
        string value2
    ) => value1.Value.Equals(value2);

    public static bool operator !=(
        ReassignSchedulingBookingRequestOverridesItem value1,
        string value2
    ) => !value1.Value.Equals(value2);

    public static explicit operator string(ReassignSchedulingBookingRequestOverridesItem value) =>
        value.Value;

    public static explicit operator ReassignSchedulingBookingRequestOverridesItem(string value) =>
        new(value);

    internal class ReassignSchedulingBookingRequestOverridesItemSerializer
        : JsonConverter<ReassignSchedulingBookingRequestOverridesItem>
    {
        public override ReassignSchedulingBookingRequestOverridesItem Read(
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
            return new ReassignSchedulingBookingRequestOverridesItem(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            ReassignSchedulingBookingRequestOverridesItem value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override ReassignSchedulingBookingRequestOverridesItem ReadAsPropertyName(
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
            return new ReassignSchedulingBookingRequestOverridesItem(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            ReassignSchedulingBookingRequestOverridesItem value,
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
        public const string AnyHost = "any_host";

        public const string OutOfOffice = "out_of_office";

        public const string OutsideAvailability = "outside_availability";

        public const string HostBusy = "host_busy";

        public const string LimitReached = "limit_reached";

        public const string CalendarUnverified = "calendar_unverified";
    }
}
