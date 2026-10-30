using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(VerificationWebhookEventType.VerificationWebhookEventTypeSerializer))]
[Serializable]
public readonly record struct VerificationWebhookEventType : IStringEnum
{
    public static readonly VerificationWebhookEventType VerificationApproved = new(
        Values.VerificationApproved
    );

    public static readonly VerificationWebhookEventType VerificationFailed = new(
        Values.VerificationFailed
    );

    public static readonly VerificationWebhookEventType VerificationBlocked = new(
        Values.VerificationBlocked
    );

    public VerificationWebhookEventType(string value)
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
    public static VerificationWebhookEventType FromCustom(string value)
    {
        return new VerificationWebhookEventType(value);
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

    public static bool operator ==(VerificationWebhookEventType value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(VerificationWebhookEventType value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(VerificationWebhookEventType value) => value.Value;

    public static explicit operator VerificationWebhookEventType(string value) => new(value);

    internal class VerificationWebhookEventTypeSerializer
        : JsonConverter<VerificationWebhookEventType>
    {
        public override VerificationWebhookEventType Read(
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
            return new VerificationWebhookEventType(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            VerificationWebhookEventType value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override VerificationWebhookEventType ReadAsPropertyName(
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
            return new VerificationWebhookEventType(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            VerificationWebhookEventType value,
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
        public const string VerificationApproved = "verification.approved";

        public const string VerificationFailed = "verification.failed";

        public const string VerificationBlocked = "verification.blocked";
    }
}
