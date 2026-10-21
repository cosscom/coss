using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(BillingWebhookEventTwoDataChange.BillingWebhookEventTwoDataChangeSerializer))]
[Serializable]
public readonly record struct BillingWebhookEventTwoDataChange : IStringEnum
{
    public static readonly BillingWebhookEventTwoDataChange Upgrade = new(Values.Upgrade);

    public static readonly BillingWebhookEventTwoDataChange Downgrade = new(Values.Downgrade);

    public static readonly BillingWebhookEventTwoDataChange Cancellation = new(Values.Cancellation);

    public static readonly BillingWebhookEventTwoDataChange Reverted = new(Values.Reverted);

    public static readonly BillingWebhookEventTwoDataChange Contract = new(Values.Contract);

    public BillingWebhookEventTwoDataChange(string value)
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
    public static BillingWebhookEventTwoDataChange FromCustom(string value)
    {
        return new BillingWebhookEventTwoDataChange(value);
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

    public static bool operator ==(BillingWebhookEventTwoDataChange value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(BillingWebhookEventTwoDataChange value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(BillingWebhookEventTwoDataChange value) => value.Value;

    public static explicit operator BillingWebhookEventTwoDataChange(string value) => new(value);

    internal class BillingWebhookEventTwoDataChangeSerializer
        : JsonConverter<BillingWebhookEventTwoDataChange>
    {
        public override BillingWebhookEventTwoDataChange Read(
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
            return new BillingWebhookEventTwoDataChange(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            BillingWebhookEventTwoDataChange value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override BillingWebhookEventTwoDataChange ReadAsPropertyName(
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
            return new BillingWebhookEventTwoDataChange(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            BillingWebhookEventTwoDataChange value,
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
        public const string Upgrade = "upgrade";

        public const string Downgrade = "downgrade";

        public const string Cancellation = "cancellation";

        public const string Reverted = "reverted";

        public const string Contract = "contract";
    }
}
