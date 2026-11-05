using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(SchedulingLocationAddressType.SchedulingLocationAddressTypeSerializer))]
[Serializable]
public readonly record struct SchedulingLocationAddressType : IStringEnum
{
    public static readonly SchedulingLocationAddressType InPerson = new(Values.InPerson);

    public SchedulingLocationAddressType(string value)
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
    public static SchedulingLocationAddressType FromCustom(string value)
    {
        return new SchedulingLocationAddressType(value);
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

    public static bool operator ==(SchedulingLocationAddressType value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(SchedulingLocationAddressType value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(SchedulingLocationAddressType value) => value.Value;

    public static explicit operator SchedulingLocationAddressType(string value) => new(value);

    internal class SchedulingLocationAddressTypeSerializer
        : JsonConverter<SchedulingLocationAddressType>
    {
        public override SchedulingLocationAddressType Read(
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
            return new SchedulingLocationAddressType(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            SchedulingLocationAddressType value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override SchedulingLocationAddressType ReadAsPropertyName(
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
            return new SchedulingLocationAddressType(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            SchedulingLocationAddressType value,
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
        public const string InPerson = "in_person";
    }
}
