using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(AudienceContactsAddedObject.AudienceContactsAddedObjectSerializer))]
[Serializable]
public readonly record struct AudienceContactsAddedObject : IStringEnum
{
    public static readonly AudienceContactsAddedObject AudienceContacts = new(
        Values.AudienceContacts
    );

    public AudienceContactsAddedObject(string value)
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
    public static AudienceContactsAddedObject FromCustom(string value)
    {
        return new AudienceContactsAddedObject(value);
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

    public static bool operator ==(AudienceContactsAddedObject value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(AudienceContactsAddedObject value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(AudienceContactsAddedObject value) => value.Value;

    public static explicit operator AudienceContactsAddedObject(string value) => new(value);

    internal class AudienceContactsAddedObjectSerializer
        : JsonConverter<AudienceContactsAddedObject>
    {
        public override AudienceContactsAddedObject Read(
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
            return new AudienceContactsAddedObject(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            AudienceContactsAddedObject value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override AudienceContactsAddedObject ReadAsPropertyName(
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
            return new AudienceContactsAddedObject(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            AudienceContactsAddedObject value,
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
        public const string AudienceContacts = "audience_contacts";
    }
}
