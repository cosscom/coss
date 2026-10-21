using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(WebhookEndpointListObject.WebhookEndpointListObjectSerializer))]
[Serializable]
public readonly record struct WebhookEndpointListObject : IStringEnum
{
    public static readonly WebhookEndpointListObject List = new(Values.List);

    public WebhookEndpointListObject(string value)
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
    public static WebhookEndpointListObject FromCustom(string value)
    {
        return new WebhookEndpointListObject(value);
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

    public static bool operator ==(WebhookEndpointListObject value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(WebhookEndpointListObject value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(WebhookEndpointListObject value) => value.Value;

    public static explicit operator WebhookEndpointListObject(string value) => new(value);

    internal class WebhookEndpointListObjectSerializer : JsonConverter<WebhookEndpointListObject>
    {
        public override WebhookEndpointListObject Read(
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
            return new WebhookEndpointListObject(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            WebhookEndpointListObject value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override WebhookEndpointListObject ReadAsPropertyName(
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
            return new WebhookEndpointListObject(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            WebhookEndpointListObject value,
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
