using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(ContactObject.ContactObjectSerializer))]
[Serializable]
public readonly record struct ContactObject : IStringEnum
{
    public static readonly ContactObject Contact = new(Values.Contact);

    public ContactObject(string value)
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
    public static ContactObject FromCustom(string value)
    {
        return new ContactObject(value);
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

    public static bool operator ==(ContactObject value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(ContactObject value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(ContactObject value) => value.Value;

    public static explicit operator ContactObject(string value) => new(value);

    internal class ContactObjectSerializer : JsonConverter<ContactObject>
    {
        public override ContactObject Read(
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
            return new ContactObject(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            ContactObject value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override ContactObject ReadAsPropertyName(
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
            return new ContactObject(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            ContactObject value,
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
        public const string Contact = "contact";
    }
}
