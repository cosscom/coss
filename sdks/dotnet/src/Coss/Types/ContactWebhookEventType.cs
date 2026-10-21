using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(ContactWebhookEventType.ContactWebhookEventTypeSerializer))]
[Serializable]
public readonly record struct ContactWebhookEventType : IStringEnum
{
    public static readonly ContactWebhookEventType ContactCreated = new(Values.ContactCreated);

    public static readonly ContactWebhookEventType ContactUpdated = new(Values.ContactUpdated);

    public static readonly ContactWebhookEventType ContactDeleted = new(Values.ContactDeleted);

    public static readonly ContactWebhookEventType ContactUnsubscribed = new(
        Values.ContactUnsubscribed
    );

    public static readonly ContactWebhookEventType ContactConfirmed = new(Values.ContactConfirmed);

    public ContactWebhookEventType(string value)
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
    public static ContactWebhookEventType FromCustom(string value)
    {
        return new ContactWebhookEventType(value);
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

    public static bool operator ==(ContactWebhookEventType value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(ContactWebhookEventType value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(ContactWebhookEventType value) => value.Value;

    public static explicit operator ContactWebhookEventType(string value) => new(value);

    internal class ContactWebhookEventTypeSerializer : JsonConverter<ContactWebhookEventType>
    {
        public override ContactWebhookEventType Read(
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
            return new ContactWebhookEventType(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            ContactWebhookEventType value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override ContactWebhookEventType ReadAsPropertyName(
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
            return new ContactWebhookEventType(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            ContactWebhookEventType value,
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
        public const string ContactCreated = "contact.created";

        public const string ContactUpdated = "contact.updated";

        public const string ContactDeleted = "contact.deleted";

        public const string ContactUnsubscribed = "contact.unsubscribed";

        public const string ContactConfirmed = "contact.confirmed";
    }
}
