using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(
    typeof(SignRequestWebhookEventDataStatus.SignRequestWebhookEventDataStatusSerializer)
)]
[Serializable]
public readonly record struct SignRequestWebhookEventDataStatus : IStringEnum
{
    public static readonly SignRequestWebhookEventDataStatus Draft = new(Values.Draft);

    public static readonly SignRequestWebhookEventDataStatus Sent = new(Values.Sent);

    public static readonly SignRequestWebhookEventDataStatus Completed = new(Values.Completed);

    public static readonly SignRequestWebhookEventDataStatus Declined = new(Values.Declined);

    public static readonly SignRequestWebhookEventDataStatus Canceled = new(Values.Canceled);

    public static readonly SignRequestWebhookEventDataStatus Expired = new(Values.Expired);

    public SignRequestWebhookEventDataStatus(string value)
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
    public static SignRequestWebhookEventDataStatus FromCustom(string value)
    {
        return new SignRequestWebhookEventDataStatus(value);
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

    public static bool operator ==(SignRequestWebhookEventDataStatus value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(SignRequestWebhookEventDataStatus value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(SignRequestWebhookEventDataStatus value) => value.Value;

    public static explicit operator SignRequestWebhookEventDataStatus(string value) => new(value);

    internal class SignRequestWebhookEventDataStatusSerializer
        : JsonConverter<SignRequestWebhookEventDataStatus>
    {
        public override SignRequestWebhookEventDataStatus Read(
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
            return new SignRequestWebhookEventDataStatus(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            SignRequestWebhookEventDataStatus value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override SignRequestWebhookEventDataStatus ReadAsPropertyName(
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
            return new SignRequestWebhookEventDataStatus(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            SignRequestWebhookEventDataStatus value,
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
        public const string Draft = "draft";

        public const string Sent = "sent";

        public const string Completed = "completed";

        public const string Declined = "declined";

        public const string Canceled = "canceled";

        public const string Expired = "expired";
    }
}
