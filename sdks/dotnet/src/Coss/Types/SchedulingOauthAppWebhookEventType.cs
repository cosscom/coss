using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(
    typeof(SchedulingOauthAppWebhookEventType.SchedulingOauthAppWebhookEventTypeSerializer)
)]
[Serializable]
public readonly record struct SchedulingOauthAppWebhookEventType : IStringEnum
{
    public static readonly SchedulingOauthAppWebhookEventType SchedulingOauthAppFailing = new(
        Values.SchedulingOauthAppFailing
    );

    public static readonly SchedulingOauthAppWebhookEventType SchedulingOauthAppRestored = new(
        Values.SchedulingOauthAppRestored
    );

    public SchedulingOauthAppWebhookEventType(string value)
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
    public static SchedulingOauthAppWebhookEventType FromCustom(string value)
    {
        return new SchedulingOauthAppWebhookEventType(value);
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

    public static bool operator ==(SchedulingOauthAppWebhookEventType value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(SchedulingOauthAppWebhookEventType value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(SchedulingOauthAppWebhookEventType value) => value.Value;

    public static explicit operator SchedulingOauthAppWebhookEventType(string value) => new(value);

    internal class SchedulingOauthAppWebhookEventTypeSerializer
        : JsonConverter<SchedulingOauthAppWebhookEventType>
    {
        public override SchedulingOauthAppWebhookEventType Read(
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
            return new SchedulingOauthAppWebhookEventType(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            SchedulingOauthAppWebhookEventType value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override SchedulingOauthAppWebhookEventType ReadAsPropertyName(
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
            return new SchedulingOauthAppWebhookEventType(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            SchedulingOauthAppWebhookEventType value,
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
        public const string SchedulingOauthAppFailing = "scheduling.oauth_app.failing";

        public const string SchedulingOauthAppRestored = "scheduling.oauth_app.restored";
    }
}
