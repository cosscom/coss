using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss.Scheduling;

[JsonConverter(
    typeof(UndoSchedulingReassignmentRequestOverridesItem.UndoSchedulingReassignmentRequestOverridesItemSerializer)
)]
[Serializable]
public readonly record struct UndoSchedulingReassignmentRequestOverridesItem : IStringEnum
{
    public static readonly UndoSchedulingReassignmentRequestOverridesItem AnyHost = new(
        Values.AnyHost
    );

    public static readonly UndoSchedulingReassignmentRequestOverridesItem OutOfOffice = new(
        Values.OutOfOffice
    );

    public static readonly UndoSchedulingReassignmentRequestOverridesItem OutsideAvailability = new(
        Values.OutsideAvailability
    );

    public static readonly UndoSchedulingReassignmentRequestOverridesItem HostBusy = new(
        Values.HostBusy
    );

    public static readonly UndoSchedulingReassignmentRequestOverridesItem LimitReached = new(
        Values.LimitReached
    );

    public static readonly UndoSchedulingReassignmentRequestOverridesItem CalendarUnverified = new(
        Values.CalendarUnverified
    );

    public UndoSchedulingReassignmentRequestOverridesItem(string value)
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
    public static UndoSchedulingReassignmentRequestOverridesItem FromCustom(string value)
    {
        return new UndoSchedulingReassignmentRequestOverridesItem(value);
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
        UndoSchedulingReassignmentRequestOverridesItem value1,
        string value2
    ) => value1.Value.Equals(value2);

    public static bool operator !=(
        UndoSchedulingReassignmentRequestOverridesItem value1,
        string value2
    ) => !value1.Value.Equals(value2);

    public static explicit operator string(UndoSchedulingReassignmentRequestOverridesItem value) =>
        value.Value;

    public static explicit operator UndoSchedulingReassignmentRequestOverridesItem(string value) =>
        new(value);

    internal class UndoSchedulingReassignmentRequestOverridesItemSerializer
        : JsonConverter<UndoSchedulingReassignmentRequestOverridesItem>
    {
        public override UndoSchedulingReassignmentRequestOverridesItem Read(
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
            return new UndoSchedulingReassignmentRequestOverridesItem(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            UndoSchedulingReassignmentRequestOverridesItem value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override UndoSchedulingReassignmentRequestOverridesItem ReadAsPropertyName(
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
            return new UndoSchedulingReassignmentRequestOverridesItem(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            UndoSchedulingReassignmentRequestOverridesItem value,
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
