using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(WebhookListenerDeliveryObject.WebhookListenerDeliveryObjectSerializer))]
[Serializable]
public readonly record struct WebhookListenerDeliveryObject : IStringEnum
{
    public static readonly WebhookListenerDeliveryObject WebhookListenerDelivery = new(
        Values.WebhookListenerDelivery
    );

    public WebhookListenerDeliveryObject(string value)
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
    public static WebhookListenerDeliveryObject FromCustom(string value)
    {
        return new WebhookListenerDeliveryObject(value);
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

    public static bool operator ==(WebhookListenerDeliveryObject value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(WebhookListenerDeliveryObject value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(WebhookListenerDeliveryObject value) => value.Value;

    public static explicit operator WebhookListenerDeliveryObject(string value) => new(value);

    internal class WebhookListenerDeliveryObjectSerializer
        : JsonConverter<WebhookListenerDeliveryObject>
    {
        public override WebhookListenerDeliveryObject Read(
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
            return new WebhookListenerDeliveryObject(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            WebhookListenerDeliveryObject value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override WebhookListenerDeliveryObject ReadAsPropertyName(
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
            return new WebhookListenerDeliveryObject(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            WebhookListenerDeliveryObject value,
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
        public const string WebhookListenerDelivery = "webhook_listener_delivery";
    }
}
