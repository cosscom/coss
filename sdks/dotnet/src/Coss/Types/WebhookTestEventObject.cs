using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(WebhookTestEventObject.WebhookTestEventObjectSerializer))]
[Serializable]
public readonly record struct WebhookTestEventObject : IStringEnum
{
    public static readonly WebhookTestEventObject WebhookTestEvent = new(Values.WebhookTestEvent);

    public WebhookTestEventObject(string value)
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
    public static WebhookTestEventObject FromCustom(string value)
    {
        return new WebhookTestEventObject(value);
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

    public static bool operator ==(WebhookTestEventObject value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(WebhookTestEventObject value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(WebhookTestEventObject value) => value.Value;

    public static explicit operator WebhookTestEventObject(string value) => new(value);

    internal class WebhookTestEventObjectSerializer : JsonConverter<WebhookTestEventObject>
    {
        public override WebhookTestEventObject Read(
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
            return new WebhookTestEventObject(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            WebhookTestEventObject value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override WebhookTestEventObject ReadAsPropertyName(
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
            return new WebhookTestEventObject(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            WebhookTestEventObject value,
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
        public const string WebhookTestEvent = "webhook_test_event";
    }
}
