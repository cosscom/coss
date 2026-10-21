using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(HookEndpointWebhookEventType.HookEndpointWebhookEventTypeSerializer))]
[Serializable]
public readonly record struct HookEndpointWebhookEventType : IStringEnum
{
    public static readonly HookEndpointWebhookEventType HookEndpointDisabled = new(
        Values.HookEndpointDisabled
    );

    public HookEndpointWebhookEventType(string value)
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
    public static HookEndpointWebhookEventType FromCustom(string value)
    {
        return new HookEndpointWebhookEventType(value);
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

    public static bool operator ==(HookEndpointWebhookEventType value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(HookEndpointWebhookEventType value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(HookEndpointWebhookEventType value) => value.Value;

    public static explicit operator HookEndpointWebhookEventType(string value) => new(value);

    internal class HookEndpointWebhookEventTypeSerializer
        : JsonConverter<HookEndpointWebhookEventType>
    {
        public override HookEndpointWebhookEventType Read(
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
            return new HookEndpointWebhookEventType(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            HookEndpointWebhookEventType value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override HookEndpointWebhookEventType ReadAsPropertyName(
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
            return new HookEndpointWebhookEventType(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            HookEndpointWebhookEventType value,
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
        public const string HookEndpointDisabled = "hook_endpoint.disabled";
    }
}
