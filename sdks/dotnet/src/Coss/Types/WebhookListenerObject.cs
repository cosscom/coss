using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(WebhookListenerObject.WebhookListenerObjectSerializer))]
[Serializable]
public readonly record struct WebhookListenerObject : IStringEnum
{
    public static readonly WebhookListenerObject WebhookListener = new(Values.WebhookListener);

    public WebhookListenerObject(string value)
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
    public static WebhookListenerObject FromCustom(string value)
    {
        return new WebhookListenerObject(value);
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

    public static bool operator ==(WebhookListenerObject value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(WebhookListenerObject value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(WebhookListenerObject value) => value.Value;

    public static explicit operator WebhookListenerObject(string value) => new(value);

    internal class WebhookListenerObjectSerializer : JsonConverter<WebhookListenerObject>
    {
        public override WebhookListenerObject Read(
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
            return new WebhookListenerObject(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            WebhookListenerObject value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override WebhookListenerObject ReadAsPropertyName(
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
            return new WebhookListenerObject(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            WebhookListenerObject value,
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
        public const string WebhookListener = "webhook_listener";
    }
}
