using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(HookEndpointWebhookEventObject.HookEndpointWebhookEventObjectSerializer))]
[Serializable]
public readonly record struct HookEndpointWebhookEventObject : IStringEnum
{
    public static readonly HookEndpointWebhookEventObject Event = new(Values.Event);

    public HookEndpointWebhookEventObject(string value)
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
    public static HookEndpointWebhookEventObject FromCustom(string value)
    {
        return new HookEndpointWebhookEventObject(value);
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

    public static bool operator ==(HookEndpointWebhookEventObject value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(HookEndpointWebhookEventObject value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(HookEndpointWebhookEventObject value) => value.Value;

    public static explicit operator HookEndpointWebhookEventObject(string value) => new(value);

    internal class HookEndpointWebhookEventObjectSerializer
        : JsonConverter<HookEndpointWebhookEventObject>
    {
        public override HookEndpointWebhookEventObject Read(
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
            return new HookEndpointWebhookEventObject(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            HookEndpointWebhookEventObject value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override HookEndpointWebhookEventObject ReadAsPropertyName(
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
            return new HookEndpointWebhookEventObject(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            HookEndpointWebhookEventObject value,
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
