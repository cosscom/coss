using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(
    typeof(SchedulingReassignmentItemOutcome.SchedulingReassignmentItemOutcomeSerializer)
)]
[Serializable]
public readonly record struct SchedulingReassignmentItemOutcome : IStringEnum
{
    public static readonly SchedulingReassignmentItemOutcome Pending = new(Values.Pending);

    public static readonly SchedulingReassignmentItemOutcome Reassigned = new(Values.Reassigned);

    public static readonly SchedulingReassignmentItemOutcome SkippedChanged = new(
        Values.SkippedChanged
    );

    public static readonly SchedulingReassignmentItemOutcome NoCandidate = new(Values.NoCandidate);

    public static readonly SchedulingReassignmentItemOutcome Failed = new(Values.Failed);

    public static readonly SchedulingReassignmentItemOutcome Cancelled = new(Values.Cancelled);

    public SchedulingReassignmentItemOutcome(string value)
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
    public static SchedulingReassignmentItemOutcome FromCustom(string value)
    {
        return new SchedulingReassignmentItemOutcome(value);
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

    public static bool operator ==(SchedulingReassignmentItemOutcome value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(SchedulingReassignmentItemOutcome value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(SchedulingReassignmentItemOutcome value) => value.Value;

    public static explicit operator SchedulingReassignmentItemOutcome(string value) => new(value);

    internal class SchedulingReassignmentItemOutcomeSerializer
        : JsonConverter<SchedulingReassignmentItemOutcome>
    {
        public override SchedulingReassignmentItemOutcome Read(
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
            return new SchedulingReassignmentItemOutcome(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            SchedulingReassignmentItemOutcome value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override SchedulingReassignmentItemOutcome ReadAsPropertyName(
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
            return new SchedulingReassignmentItemOutcome(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            SchedulingReassignmentItemOutcome value,
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

        public const string Reassigned = "reassigned";

        public const string SkippedChanged = "skipped_changed";

        public const string NoCandidate = "no_candidate";

        public const string Failed = "failed";

        public const string Cancelled = "cancelled";
    }
}
