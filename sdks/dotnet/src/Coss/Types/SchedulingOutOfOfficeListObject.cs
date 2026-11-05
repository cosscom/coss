using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(SchedulingOutOfOfficeListObject.SchedulingOutOfOfficeListObjectSerializer))]
[Serializable]
public readonly record struct SchedulingOutOfOfficeListObject : IStringEnum
{
    public static readonly SchedulingOutOfOfficeListObject List = new(Values.List);

    public SchedulingOutOfOfficeListObject(string value)
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
    public static SchedulingOutOfOfficeListObject FromCustom(string value)
    {
        return new SchedulingOutOfOfficeListObject(value);
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

    public static bool operator ==(SchedulingOutOfOfficeListObject value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(SchedulingOutOfOfficeListObject value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(SchedulingOutOfOfficeListObject value) => value.Value;

    public static explicit operator SchedulingOutOfOfficeListObject(string value) => new(value);

    internal class SchedulingOutOfOfficeListObjectSerializer
        : JsonConverter<SchedulingOutOfOfficeListObject>
    {
        public override SchedulingOutOfOfficeListObject Read(
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
            return new SchedulingOutOfOfficeListObject(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            SchedulingOutOfOfficeListObject value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override SchedulingOutOfOfficeListObject ReadAsPropertyName(
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
            return new SchedulingOutOfOfficeListObject(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            SchedulingOutOfOfficeListObject value,
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
