using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(AccountWebhookEventType.AccountWebhookEventTypeSerializer))]
[Serializable]
public readonly record struct AccountWebhookEventType : IStringEnum
{
    public static readonly AccountWebhookEventType AccountReputationWarning = new(
        Values.AccountReputationWarning
    );

    public static readonly AccountWebhookEventType AccountReputationRecovered = new(
        Values.AccountReputationRecovered
    );

    public static readonly AccountWebhookEventType AccountSuspended = new(Values.AccountSuspended);

    public static readonly AccountWebhookEventType AccountReinstated = new(
        Values.AccountReinstated
    );

    public static readonly AccountWebhookEventType AccountMarketingPaused = new(
        Values.AccountMarketingPaused
    );

    public static readonly AccountWebhookEventType AccountMarketingReinstated = new(
        Values.AccountMarketingReinstated
    );

    public AccountWebhookEventType(string value)
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
    public static AccountWebhookEventType FromCustom(string value)
    {
        return new AccountWebhookEventType(value);
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

    public static bool operator ==(AccountWebhookEventType value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(AccountWebhookEventType value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(AccountWebhookEventType value) => value.Value;

    public static explicit operator AccountWebhookEventType(string value) => new(value);

    internal class AccountWebhookEventTypeSerializer : JsonConverter<AccountWebhookEventType>
    {
        public override AccountWebhookEventType Read(
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
            return new AccountWebhookEventType(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            AccountWebhookEventType value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override AccountWebhookEventType ReadAsPropertyName(
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
            return new AccountWebhookEventType(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            AccountWebhookEventType value,
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
        public const string AccountReputationWarning = "account.reputation_warning";

        public const string AccountReputationRecovered = "account.reputation_recovered";

        public const string AccountSuspended = "account.suspended";

        public const string AccountReinstated = "account.reinstated";

        public const string AccountMarketingPaused = "account.marketing_paused";

        public const string AccountMarketingReinstated = "account.marketing_reinstated";
    }
}
