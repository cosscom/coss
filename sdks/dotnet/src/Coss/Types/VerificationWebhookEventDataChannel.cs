using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(
    typeof(VerificationWebhookEventDataChannel.VerificationWebhookEventDataChannelSerializer)
)]
[Serializable]
public readonly record struct VerificationWebhookEventDataChannel : IStringEnum
{
    public static readonly VerificationWebhookEventDataChannel Sms = new(Values.Sms);

    public static readonly VerificationWebhookEventDataChannel Email = new(Values.Email);

    public VerificationWebhookEventDataChannel(string value)
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
    public static VerificationWebhookEventDataChannel FromCustom(string value)
    {
        return new VerificationWebhookEventDataChannel(value);
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

    public static bool operator ==(VerificationWebhookEventDataChannel value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(VerificationWebhookEventDataChannel value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(VerificationWebhookEventDataChannel value) =>
        value.Value;

    public static explicit operator VerificationWebhookEventDataChannel(string value) => new(value);

    internal class VerificationWebhookEventDataChannelSerializer
        : JsonConverter<VerificationWebhookEventDataChannel>
    {
        public override VerificationWebhookEventDataChannel Read(
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
            return new VerificationWebhookEventDataChannel(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            VerificationWebhookEventDataChannel value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override VerificationWebhookEventDataChannel ReadAsPropertyName(
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
            return new VerificationWebhookEventDataChannel(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            VerificationWebhookEventDataChannel value,
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
        public const string Sms = "sms";

        public const string Email = "email";
    }
}
