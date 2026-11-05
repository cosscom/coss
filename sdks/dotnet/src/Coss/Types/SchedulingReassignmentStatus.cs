using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(SchedulingReassignmentStatus.SchedulingReassignmentStatusSerializer))]
[Serializable]
public readonly record struct SchedulingReassignmentStatus : IStringEnum
{
    public static readonly SchedulingReassignmentStatus Pending = new(Values.Pending);

    public static readonly SchedulingReassignmentStatus Running = new(Values.Running);

    public static readonly SchedulingReassignmentStatus Completed = new(Values.Completed);

    public static readonly SchedulingReassignmentStatus Cancelled = new(Values.Cancelled);

    public SchedulingReassignmentStatus(string value)
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
    public static SchedulingReassignmentStatus FromCustom(string value)
    {
        return new SchedulingReassignmentStatus(value);
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

    public static bool operator ==(SchedulingReassignmentStatus value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(SchedulingReassignmentStatus value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(SchedulingReassignmentStatus value) => value.Value;

    public static explicit operator SchedulingReassignmentStatus(string value) => new(value);

    internal class SchedulingReassignmentStatusSerializer
        : JsonConverter<SchedulingReassignmentStatus>
    {
        public override SchedulingReassignmentStatus Read(
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
            return new SchedulingReassignmentStatus(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            SchedulingReassignmentStatus value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override SchedulingReassignmentStatus ReadAsPropertyName(
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
            return new SchedulingReassignmentStatus(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            SchedulingReassignmentStatus value,
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

        public const string Running = "running";

        public const string Completed = "completed";

        public const string Cancelled = "cancelled";
    }
}
