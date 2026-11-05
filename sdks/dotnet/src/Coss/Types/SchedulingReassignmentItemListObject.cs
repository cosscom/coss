using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(
    typeof(SchedulingReassignmentItemListObject.SchedulingReassignmentItemListObjectSerializer)
)]
[Serializable]
public readonly record struct SchedulingReassignmentItemListObject : IStringEnum
{
    public static readonly SchedulingReassignmentItemListObject List = new(Values.List);

    public SchedulingReassignmentItemListObject(string value)
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
    public static SchedulingReassignmentItemListObject FromCustom(string value)
    {
        return new SchedulingReassignmentItemListObject(value);
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

    public static bool operator ==(SchedulingReassignmentItemListObject value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(SchedulingReassignmentItemListObject value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(SchedulingReassignmentItemListObject value) =>
        value.Value;

    public static explicit operator SchedulingReassignmentItemListObject(string value) =>
        new(value);

    internal class SchedulingReassignmentItemListObjectSerializer
        : JsonConverter<SchedulingReassignmentItemListObject>
    {
        public override SchedulingReassignmentItemListObject Read(
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
            return new SchedulingReassignmentItemListObject(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            SchedulingReassignmentItemListObject value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override SchedulingReassignmentItemListObject ReadAsPropertyName(
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
            return new SchedulingReassignmentItemListObject(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            SchedulingReassignmentItemListObject value,
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
        public const string List = "list";
    }
}
