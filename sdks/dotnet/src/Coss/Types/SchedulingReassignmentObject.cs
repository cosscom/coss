using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(SchedulingReassignmentObject.SchedulingReassignmentObjectSerializer))]
[Serializable]
public readonly record struct SchedulingReassignmentObject : IStringEnum
{
    public static readonly SchedulingReassignmentObject SchedulingReassignment = new(
        Values.SchedulingReassignment
    );

    public SchedulingReassignmentObject(string value)
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
    public static SchedulingReassignmentObject FromCustom(string value)
    {
        return new SchedulingReassignmentObject(value);
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

    public static bool operator ==(SchedulingReassignmentObject value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(SchedulingReassignmentObject value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(SchedulingReassignmentObject value) => value.Value;

    public static explicit operator SchedulingReassignmentObject(string value) => new(value);

    internal class SchedulingReassignmentObjectSerializer
        : JsonConverter<SchedulingReassignmentObject>
    {
        public override SchedulingReassignmentObject Read(
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
            return new SchedulingReassignmentObject(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            SchedulingReassignmentObject value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override SchedulingReassignmentObject ReadAsPropertyName(
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
            return new SchedulingReassignmentObject(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            SchedulingReassignmentObject value,
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
        public const string SchedulingReassignment = "scheduling.reassignment";
    }
}
