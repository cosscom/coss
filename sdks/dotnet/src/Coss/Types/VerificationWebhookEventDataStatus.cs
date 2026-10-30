using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(
    typeof(VerificationWebhookEventDataStatus.VerificationWebhookEventDataStatusSerializer)
)]
[Serializable]
public readonly record struct VerificationWebhookEventDataStatus : IStringEnum
{
    public static readonly VerificationWebhookEventDataStatus Pending = new(Values.Pending);

    public static readonly VerificationWebhookEventDataStatus Approved = new(Values.Approved);

    public static readonly VerificationWebhookEventDataStatus Expired = new(Values.Expired);

    public static readonly VerificationWebhookEventDataStatus Canceled = new(Values.Canceled);

    public static readonly VerificationWebhookEventDataStatus Failed = new(Values.Failed);

    public static readonly VerificationWebhookEventDataStatus Blocked = new(Values.Blocked);

    public VerificationWebhookEventDataStatus(string value)
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
    public static VerificationWebhookEventDataStatus FromCustom(string value)
    {
        return new VerificationWebhookEventDataStatus(value);
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

    public static bool operator ==(VerificationWebhookEventDataStatus value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(VerificationWebhookEventDataStatus value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(VerificationWebhookEventDataStatus value) => value.Value;

    public static explicit operator VerificationWebhookEventDataStatus(string value) => new(value);

    internal class VerificationWebhookEventDataStatusSerializer
        : JsonConverter<VerificationWebhookEventDataStatus>
    {
        public override VerificationWebhookEventDataStatus Read(
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
            return new VerificationWebhookEventDataStatus(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            VerificationWebhookEventDataStatus value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override VerificationWebhookEventDataStatus ReadAsPropertyName(
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
            return new VerificationWebhookEventDataStatus(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            VerificationWebhookEventDataStatus value,
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

        public const string Approved = "approved";

        public const string Expired = "expired";

        public const string Canceled = "canceled";

        public const string Failed = "failed";

        public const string Blocked = "blocked";
    }
}
