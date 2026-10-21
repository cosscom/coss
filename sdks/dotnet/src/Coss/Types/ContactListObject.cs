using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(ContactListObject.ContactListObjectSerializer))]
[Serializable]
public readonly record struct ContactListObject : IStringEnum
{
    public static readonly ContactListObject List = new(Values.List);

    public ContactListObject(string value)
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
    public static ContactListObject FromCustom(string value)
    {
        return new ContactListObject(value);
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

    public static bool operator ==(ContactListObject value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(ContactListObject value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(ContactListObject value) => value.Value;

    public static explicit operator ContactListObject(string value) => new(value);

    internal class ContactListObjectSerializer : JsonConverter<ContactListObject>
    {
        public override ContactListObject Read(
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
            return new ContactListObject(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            ContactListObject value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override ContactListObject ReadAsPropertyName(
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
            return new ContactListObject(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            ContactListObject value,
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
