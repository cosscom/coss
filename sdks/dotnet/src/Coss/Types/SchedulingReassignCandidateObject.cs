using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(
    typeof(SchedulingReassignCandidateObject.SchedulingReassignCandidateObjectSerializer)
)]
[Serializable]
public readonly record struct SchedulingReassignCandidateObject : IStringEnum
{
    public static readonly SchedulingReassignCandidateObject SchedulingReassignCandidate = new(
        Values.SchedulingReassignCandidate
    );

    public SchedulingReassignCandidateObject(string value)
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
    public static SchedulingReassignCandidateObject FromCustom(string value)
    {
        return new SchedulingReassignCandidateObject(value);
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

    public static bool operator ==(SchedulingReassignCandidateObject value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(SchedulingReassignCandidateObject value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(SchedulingReassignCandidateObject value) => value.Value;

    public static explicit operator SchedulingReassignCandidateObject(string value) => new(value);

    internal class SchedulingReassignCandidateObjectSerializer
        : JsonConverter<SchedulingReassignCandidateObject>
    {
        public override SchedulingReassignCandidateObject Read(
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
            return new SchedulingReassignCandidateObject(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            SchedulingReassignCandidateObject value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override SchedulingReassignCandidateObject ReadAsPropertyName(
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
            return new SchedulingReassignCandidateObject(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            SchedulingReassignCandidateObject value,
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
        public const string SchedulingReassignCandidate = "scheduling.reassign_candidate";
    }
}
