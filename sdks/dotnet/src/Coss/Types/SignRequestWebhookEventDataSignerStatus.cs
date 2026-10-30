using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(
    typeof(SignRequestWebhookEventDataSignerStatus.SignRequestWebhookEventDataSignerStatusSerializer)
)]
[Serializable]
public readonly record struct SignRequestWebhookEventDataSignerStatus : IStringEnum
{
    public static readonly SignRequestWebhookEventDataSignerStatus Pending = new(Values.Pending);

    public static readonly SignRequestWebhookEventDataSignerStatus Notified = new(Values.Notified);

    public static readonly SignRequestWebhookEventDataSignerStatus Viewed = new(Values.Viewed);

    public static readonly SignRequestWebhookEventDataSignerStatus Signed = new(Values.Signed);

    public static readonly SignRequestWebhookEventDataSignerStatus Declined = new(Values.Declined);

    public SignRequestWebhookEventDataSignerStatus(string value)
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
    public static SignRequestWebhookEventDataSignerStatus FromCustom(string value)
    {
        return new SignRequestWebhookEventDataSignerStatus(value);
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

    public static bool operator ==(SignRequestWebhookEventDataSignerStatus value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(SignRequestWebhookEventDataSignerStatus value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(SignRequestWebhookEventDataSignerStatus value) =>
        value.Value;

    public static explicit operator SignRequestWebhookEventDataSignerStatus(string value) =>
        new(value);

    internal class SignRequestWebhookEventDataSignerStatusSerializer
        : JsonConverter<SignRequestWebhookEventDataSignerStatus>
    {
        public override SignRequestWebhookEventDataSignerStatus Read(
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
            return new SignRequestWebhookEventDataSignerStatus(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            SignRequestWebhookEventDataSignerStatus value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override SignRequestWebhookEventDataSignerStatus ReadAsPropertyName(
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
            return new SignRequestWebhookEventDataSignerStatus(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            SignRequestWebhookEventDataSignerStatus value,
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
        public const string Pending = "pending";

        public const string Notified = "notified";

        public const string Viewed = "viewed";

        public const string Signed = "signed";

        public const string Declined = "declined";
    }
}
