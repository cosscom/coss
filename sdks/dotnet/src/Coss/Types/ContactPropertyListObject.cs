using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(ContactPropertyListObject.ContactPropertyListObjectSerializer))]
[Serializable]
public readonly record struct ContactPropertyListObject : IStringEnum
{
    public static readonly ContactPropertyListObject List = new(Values.List);

    public ContactPropertyListObject(string value)
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
    public static ContactPropertyListObject FromCustom(string value)
    {
        return new ContactPropertyListObject(value);
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

    public static bool operator ==(ContactPropertyListObject value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(ContactPropertyListObject value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(ContactPropertyListObject value) => value.Value;

    public static explicit operator ContactPropertyListObject(string value) => new(value);

    internal class ContactPropertyListObjectSerializer : JsonConverter<ContactPropertyListObject>
    {
        public override ContactPropertyListObject Read(
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
            return new ContactPropertyListObject(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            ContactPropertyListObject value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override ContactPropertyListObject ReadAsPropertyName(
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
            return new ContactPropertyListObject(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            ContactPropertyListObject value,
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
