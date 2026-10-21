using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(
    typeof(AccountWebhookEventDataPreviousStatus.AccountWebhookEventDataPreviousStatusSerializer)
)]
[Serializable]
public readonly record struct AccountWebhookEventDataPreviousStatus : IStringEnum
{
    public static readonly AccountWebhookEventDataPreviousStatus Good = new(Values.Good);

    public static readonly AccountWebhookEventDataPreviousStatus Warning = new(Values.Warning);

    public static readonly AccountWebhookEventDataPreviousStatus Suspended = new(Values.Suspended);

    public AccountWebhookEventDataPreviousStatus(string value)
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
    public static AccountWebhookEventDataPreviousStatus FromCustom(string value)
    {
        return new AccountWebhookEventDataPreviousStatus(value);
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

    public static bool operator ==(AccountWebhookEventDataPreviousStatus value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(AccountWebhookEventDataPreviousStatus value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(AccountWebhookEventDataPreviousStatus value) =>
        value.Value;

    public static explicit operator AccountWebhookEventDataPreviousStatus(string value) =>
        new(value);

    internal class AccountWebhookEventDataPreviousStatusSerializer
        : JsonConverter<AccountWebhookEventDataPreviousStatus>
    {
        public override AccountWebhookEventDataPreviousStatus Read(
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
            return new AccountWebhookEventDataPreviousStatus(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            AccountWebhookEventDataPreviousStatus value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override AccountWebhookEventDataPreviousStatus ReadAsPropertyName(
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
            return new AccountWebhookEventDataPreviousStatus(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            AccountWebhookEventDataPreviousStatus value,
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
        public const string Good = "good";

        public const string Warning = "warning";

        public const string Suspended = "suspended";
    }
}
