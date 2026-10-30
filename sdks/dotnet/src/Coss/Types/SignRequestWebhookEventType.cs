using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(SignRequestWebhookEventType.SignRequestWebhookEventTypeSerializer))]
[Serializable]
public readonly record struct SignRequestWebhookEventType : IStringEnum
{
    public static readonly SignRequestWebhookEventType SignRequestSent = new(
        Values.SignRequestSent
    );

    public static readonly SignRequestWebhookEventType SignRequestViewed = new(
        Values.SignRequestViewed
    );

    public static readonly SignRequestWebhookEventType SignRequestSignerSigned = new(
        Values.SignRequestSignerSigned
    );

    public static readonly SignRequestWebhookEventType SignRequestDeclined = new(
        Values.SignRequestDeclined
    );

    public static readonly SignRequestWebhookEventType SignRequestCompleted = new(
        Values.SignRequestCompleted
    );

    public static readonly SignRequestWebhookEventType SignRequestCanceled = new(
        Values.SignRequestCanceled
    );

    public static readonly SignRequestWebhookEventType SignRequestExpired = new(
        Values.SignRequestExpired
    );

    public SignRequestWebhookEventType(string value)
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
    public static SignRequestWebhookEventType FromCustom(string value)
    {
        return new SignRequestWebhookEventType(value);
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

    public static bool operator ==(SignRequestWebhookEventType value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(SignRequestWebhookEventType value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(SignRequestWebhookEventType value) => value.Value;

    public static explicit operator SignRequestWebhookEventType(string value) => new(value);

    internal class SignRequestWebhookEventTypeSerializer
        : JsonConverter<SignRequestWebhookEventType>
    {
        public override SignRequestWebhookEventType Read(
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
            return new SignRequestWebhookEventType(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            SignRequestWebhookEventType value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override SignRequestWebhookEventType ReadAsPropertyName(
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
            return new SignRequestWebhookEventType(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            SignRequestWebhookEventType value,
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
        public const string SignRequestSent = "sign_request.sent";

        public const string SignRequestViewed = "sign_request.viewed";

        public const string SignRequestSignerSigned = "sign_request.signer_signed";

        public const string SignRequestDeclined = "sign_request.declined";

        public const string SignRequestCompleted = "sign_request.completed";

        public const string SignRequestCanceled = "sign_request.canceled";

        public const string SignRequestExpired = "sign_request.expired";
    }
}
