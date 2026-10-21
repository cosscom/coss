using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(AccountWebhookEventDataStatus.AccountWebhookEventDataStatusSerializer))]
[Serializable]
public readonly record struct AccountWebhookEventDataStatus : IStringEnum
{
    public static readonly AccountWebhookEventDataStatus Good = new(Values.Good);

    public static readonly AccountWebhookEventDataStatus Warning = new(Values.Warning);

    public static readonly AccountWebhookEventDataStatus Suspended = new(Values.Suspended);

    public AccountWebhookEventDataStatus(string value)
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
    public static AccountWebhookEventDataStatus FromCustom(string value)
    {
        return new AccountWebhookEventDataStatus(value);
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

    public static bool operator ==(AccountWebhookEventDataStatus value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(AccountWebhookEventDataStatus value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(AccountWebhookEventDataStatus value) => value.Value;

    public static explicit operator AccountWebhookEventDataStatus(string value) => new(value);

    internal class AccountWebhookEventDataStatusSerializer
        : JsonConverter<AccountWebhookEventDataStatus>
    {
        public override AccountWebhookEventDataStatus Read(
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
            return new AccountWebhookEventDataStatus(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            AccountWebhookEventDataStatus value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override AccountWebhookEventDataStatus ReadAsPropertyName(
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
            return new AccountWebhookEventDataStatus(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            AccountWebhookEventDataStatus value,
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
