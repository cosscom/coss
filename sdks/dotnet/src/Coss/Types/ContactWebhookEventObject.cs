using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(ContactWebhookEventObject.ContactWebhookEventObjectSerializer))]
[Serializable]
public readonly record struct ContactWebhookEventObject : IStringEnum
{
    public static readonly ContactWebhookEventObject Event = new(Values.Event);

    public ContactWebhookEventObject(string value)
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
    public static ContactWebhookEventObject FromCustom(string value)
    {
        return new ContactWebhookEventObject(value);
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

    public static bool operator ==(ContactWebhookEventObject value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(ContactWebhookEventObject value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(ContactWebhookEventObject value) => value.Value;

    public static explicit operator ContactWebhookEventObject(string value) => new(value);

    internal class ContactWebhookEventObjectSerializer : JsonConverter<ContactWebhookEventObject>
    {
        public override ContactWebhookEventObject Read(
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
            return new ContactWebhookEventObject(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            ContactWebhookEventObject value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override ContactWebhookEventObject ReadAsPropertyName(
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
            return new ContactWebhookEventObject(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            ContactWebhookEventObject value,
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
        public const string Event = "event";
    }
}
