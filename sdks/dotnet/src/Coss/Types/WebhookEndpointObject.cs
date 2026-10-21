using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(WebhookEndpointObject.WebhookEndpointObjectSerializer))]
[Serializable]
public readonly record struct WebhookEndpointObject : IStringEnum
{
    public static readonly WebhookEndpointObject WebhookEndpoint = new(Values.WebhookEndpoint);

    public WebhookEndpointObject(string value)
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
    public static WebhookEndpointObject FromCustom(string value)
    {
        return new WebhookEndpointObject(value);
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

    public static bool operator ==(WebhookEndpointObject value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(WebhookEndpointObject value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(WebhookEndpointObject value) => value.Value;

    public static explicit operator WebhookEndpointObject(string value) => new(value);

    internal class WebhookEndpointObjectSerializer : JsonConverter<WebhookEndpointObject>
    {
        public override WebhookEndpointObject Read(
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
            return new WebhookEndpointObject(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            WebhookEndpointObject value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override WebhookEndpointObject ReadAsPropertyName(
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
            return new WebhookEndpointObject(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            WebhookEndpointObject value,
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
        public const string WebhookEndpoint = "webhook_endpoint";
    }
}
