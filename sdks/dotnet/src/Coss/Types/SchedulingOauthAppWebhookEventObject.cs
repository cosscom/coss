using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(
    typeof(SchedulingOauthAppWebhookEventObject.SchedulingOauthAppWebhookEventObjectSerializer)
)]
[Serializable]
public readonly record struct SchedulingOauthAppWebhookEventObject : IStringEnum
{
    public static readonly SchedulingOauthAppWebhookEventObject Event = new(Values.Event);

    public SchedulingOauthAppWebhookEventObject(string value)
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
    public static SchedulingOauthAppWebhookEventObject FromCustom(string value)
    {
        return new SchedulingOauthAppWebhookEventObject(value);
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

    public static bool operator ==(SchedulingOauthAppWebhookEventObject value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(SchedulingOauthAppWebhookEventObject value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(SchedulingOauthAppWebhookEventObject value) =>
        value.Value;

    public static explicit operator SchedulingOauthAppWebhookEventObject(string value) =>
        new(value);

    internal class SchedulingOauthAppWebhookEventObjectSerializer
        : JsonConverter<SchedulingOauthAppWebhookEventObject>
    {
        public override SchedulingOauthAppWebhookEventObject Read(
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
            return new SchedulingOauthAppWebhookEventObject(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            SchedulingOauthAppWebhookEventObject value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override SchedulingOauthAppWebhookEventObject ReadAsPropertyName(
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
            return new SchedulingOauthAppWebhookEventObject(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            SchedulingOauthAppWebhookEventObject value,
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
