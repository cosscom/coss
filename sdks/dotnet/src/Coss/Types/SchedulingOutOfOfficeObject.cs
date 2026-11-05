using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(SchedulingOutOfOfficeObject.SchedulingOutOfOfficeObjectSerializer))]
[Serializable]
public readonly record struct SchedulingOutOfOfficeObject : IStringEnum
{
    public static readonly SchedulingOutOfOfficeObject SchedulingOutOfOffice = new(
        Values.SchedulingOutOfOffice
    );

    public SchedulingOutOfOfficeObject(string value)
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
    public static SchedulingOutOfOfficeObject FromCustom(string value)
    {
        return new SchedulingOutOfOfficeObject(value);
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

    public static bool operator ==(SchedulingOutOfOfficeObject value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(SchedulingOutOfOfficeObject value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(SchedulingOutOfOfficeObject value) => value.Value;

    public static explicit operator SchedulingOutOfOfficeObject(string value) => new(value);

    internal class SchedulingOutOfOfficeObjectSerializer
        : JsonConverter<SchedulingOutOfOfficeObject>
    {
        public override SchedulingOutOfOfficeObject Read(
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
            return new SchedulingOutOfOfficeObject(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            SchedulingOutOfOfficeObject value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override SchedulingOutOfOfficeObject ReadAsPropertyName(
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
            return new SchedulingOutOfOfficeObject(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            SchedulingOutOfOfficeObject value,
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
        public const string SchedulingOutOfOffice = "scheduling.out_of_office";
    }
}
