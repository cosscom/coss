using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(EmailWebhookEventObject.EmailWebhookEventObjectSerializer))]
[Serializable]
public readonly record struct EmailWebhookEventObject : IStringEnum
{
    public static readonly EmailWebhookEventObject Event = new(Values.Event);

    public EmailWebhookEventObject(string value)
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
    public static EmailWebhookEventObject FromCustom(string value)
    {
        return new EmailWebhookEventObject(value);
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

    public static bool operator ==(EmailWebhookEventObject value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(EmailWebhookEventObject value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(EmailWebhookEventObject value) => value.Value;

    public static explicit operator EmailWebhookEventObject(string value) => new(value);

    internal class EmailWebhookEventObjectSerializer : JsonConverter<EmailWebhookEventObject>
    {
        public override EmailWebhookEventObject Read(
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
            return new EmailWebhookEventObject(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            EmailWebhookEventObject value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override EmailWebhookEventObject ReadAsPropertyName(
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
            return new EmailWebhookEventObject(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            EmailWebhookEventObject value,
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
