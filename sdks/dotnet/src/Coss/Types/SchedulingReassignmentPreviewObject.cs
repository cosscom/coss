using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(
    typeof(SchedulingReassignmentPreviewObject.SchedulingReassignmentPreviewObjectSerializer)
)]
[Serializable]
public readonly record struct SchedulingReassignmentPreviewObject : IStringEnum
{
    public static readonly SchedulingReassignmentPreviewObject SchedulingReassignmentPreview = new(
        Values.SchedulingReassignmentPreview
    );

    public SchedulingReassignmentPreviewObject(string value)
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
    public static SchedulingReassignmentPreviewObject FromCustom(string value)
    {
        return new SchedulingReassignmentPreviewObject(value);
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

    public static bool operator ==(SchedulingReassignmentPreviewObject value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(SchedulingReassignmentPreviewObject value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(SchedulingReassignmentPreviewObject value) =>
        value.Value;

    public static explicit operator SchedulingReassignmentPreviewObject(string value) => new(value);

    internal class SchedulingReassignmentPreviewObjectSerializer
        : JsonConverter<SchedulingReassignmentPreviewObject>
    {
        public override SchedulingReassignmentPreviewObject Read(
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
            return new SchedulingReassignmentPreviewObject(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            SchedulingReassignmentPreviewObject value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override SchedulingReassignmentPreviewObject ReadAsPropertyName(
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
            return new SchedulingReassignmentPreviewObject(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            SchedulingReassignmentPreviewObject value,
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
        public const string SchedulingReassignmentPreview = "scheduling.reassignment_preview";
    }
}
