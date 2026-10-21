using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(
    typeof(ContactWebhookEventDataContactStatus.ContactWebhookEventDataContactStatusSerializer)
)]
[Serializable]
public readonly record struct ContactWebhookEventDataContactStatus : IStringEnum
{
    public static readonly ContactWebhookEventDataContactStatus Subscribed = new(Values.Subscribed);

    public static readonly ContactWebhookEventDataContactStatus Unsubscribed = new(
        Values.Unsubscribed
    );

    public static readonly ContactWebhookEventDataContactStatus Pending = new(Values.Pending);

    public ContactWebhookEventDataContactStatus(string value)
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
    public static ContactWebhookEventDataContactStatus FromCustom(string value)
    {
        return new ContactWebhookEventDataContactStatus(value);
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

    public static bool operator ==(ContactWebhookEventDataContactStatus value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(ContactWebhookEventDataContactStatus value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(ContactWebhookEventDataContactStatus value) =>
        value.Value;

    public static explicit operator ContactWebhookEventDataContactStatus(string value) =>
        new(value);

    internal class ContactWebhookEventDataContactStatusSerializer
        : JsonConverter<ContactWebhookEventDataContactStatus>
    {
        public override ContactWebhookEventDataContactStatus Read(
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
            return new ContactWebhookEventDataContactStatus(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            ContactWebhookEventDataContactStatus value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override ContactWebhookEventDataContactStatus ReadAsPropertyName(
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
            return new ContactWebhookEventDataContactStatus(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            ContactWebhookEventDataContactStatus value,
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
        public const string Subscribed = "subscribed";

        public const string Unsubscribed = "unsubscribed";

        public const string Pending = "pending";
    }
}
