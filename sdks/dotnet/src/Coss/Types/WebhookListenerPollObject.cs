using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(WebhookListenerPollObject.WebhookListenerPollObjectSerializer))]
[Serializable]
public readonly record struct WebhookListenerPollObject : IStringEnum
{
    public static readonly WebhookListenerPollObject WebhookListenerPoll = new(
        Values.WebhookListenerPoll
    );

    public WebhookListenerPollObject(string value)
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
    public static WebhookListenerPollObject FromCustom(string value)
    {
        return new WebhookListenerPollObject(value);
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

    public static bool operator ==(WebhookListenerPollObject value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(WebhookListenerPollObject value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(WebhookListenerPollObject value) => value.Value;

    public static explicit operator WebhookListenerPollObject(string value) => new(value);

    internal class WebhookListenerPollObjectSerializer : JsonConverter<WebhookListenerPollObject>
    {
        public override WebhookListenerPollObject Read(
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
            return new WebhookListenerPollObject(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            WebhookListenerPollObject value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override WebhookListenerPollObject ReadAsPropertyName(
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
            return new WebhookListenerPollObject(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            WebhookListenerPollObject value,
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
        public const string WebhookListenerPoll = "webhook_listener_poll";
    }
}
