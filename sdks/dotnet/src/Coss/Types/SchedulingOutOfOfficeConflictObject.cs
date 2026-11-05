using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(
    typeof(SchedulingOutOfOfficeConflictObject.SchedulingOutOfOfficeConflictObjectSerializer)
)]
[Serializable]
public readonly record struct SchedulingOutOfOfficeConflictObject : IStringEnum
{
    public static readonly SchedulingOutOfOfficeConflictObject SchedulingOutOfOfficeConflict = new(
        Values.SchedulingOutOfOfficeConflict
    );

    public SchedulingOutOfOfficeConflictObject(string value)
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
    public static SchedulingOutOfOfficeConflictObject FromCustom(string value)
    {
        return new SchedulingOutOfOfficeConflictObject(value);
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

    public static bool operator ==(SchedulingOutOfOfficeConflictObject value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(SchedulingOutOfOfficeConflictObject value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(SchedulingOutOfOfficeConflictObject value) =>
        value.Value;

    public static explicit operator SchedulingOutOfOfficeConflictObject(string value) => new(value);

    internal class SchedulingOutOfOfficeConflictObjectSerializer
        : JsonConverter<SchedulingOutOfOfficeConflictObject>
    {
        public override SchedulingOutOfOfficeConflictObject Read(
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
            return new SchedulingOutOfOfficeConflictObject(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            SchedulingOutOfOfficeConflictObject value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override SchedulingOutOfOfficeConflictObject ReadAsPropertyName(
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
            return new SchedulingOutOfOfficeConflictObject(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            SchedulingOutOfOfficeConflictObject value,
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
        public const string SchedulingOutOfOfficeConflict = "scheduling.out_of_office_conflict";
    }
}
