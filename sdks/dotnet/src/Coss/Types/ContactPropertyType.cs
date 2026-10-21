using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(ContactPropertyType.ContactPropertyTypeSerializer))]
[Serializable]
public readonly record struct ContactPropertyType : IStringEnum
{
    public static readonly ContactPropertyType String = new(Values.String);

    public static readonly ContactPropertyType Number = new(Values.Number);

    public static readonly ContactPropertyType Boolean = new(Values.Boolean);

    public static readonly ContactPropertyType Date = new(Values.Date);

    public ContactPropertyType(string value)
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
    public static ContactPropertyType FromCustom(string value)
    {
        return new ContactPropertyType(value);
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

    public static bool operator ==(ContactPropertyType value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(ContactPropertyType value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(ContactPropertyType value) => value.Value;

    public static explicit operator ContactPropertyType(string value) => new(value);

    internal class ContactPropertyTypeSerializer : JsonConverter<ContactPropertyType>
    {
        public override ContactPropertyType Read(
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
            return new ContactPropertyType(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            ContactPropertyType value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override ContactPropertyType ReadAsPropertyName(
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
            return new ContactPropertyType(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            ContactPropertyType value,
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
        public const string String = "string";

        public const string Number = "number";

        public const string Boolean = "boolean";

        public const string Date = "date";
    }
}
