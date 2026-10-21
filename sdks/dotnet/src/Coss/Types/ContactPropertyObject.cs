using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(ContactPropertyObject.ContactPropertyObjectSerializer))]
[Serializable]
public readonly record struct ContactPropertyObject : IStringEnum
{
    public static readonly ContactPropertyObject ContactProperty = new(Values.ContactProperty);

    public ContactPropertyObject(string value)
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
    public static ContactPropertyObject FromCustom(string value)
    {
        return new ContactPropertyObject(value);
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

    public static bool operator ==(ContactPropertyObject value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(ContactPropertyObject value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(ContactPropertyObject value) => value.Value;

    public static explicit operator ContactPropertyObject(string value) => new(value);

    internal class ContactPropertyObjectSerializer : JsonConverter<ContactPropertyObject>
    {
        public override ContactPropertyObject Read(
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
            return new ContactPropertyObject(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            ContactPropertyObject value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override ContactPropertyObject ReadAsPropertyName(
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
            return new ContactPropertyObject(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            ContactPropertyObject value,
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
        public const string ContactProperty = "contact_property";
    }
}
