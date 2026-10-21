using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(BillingWebhookEventSixDataScope.BillingWebhookEventSixDataScopeSerializer))]
[Serializable]
public readonly record struct BillingWebhookEventSixDataScope : IStringEnum
{
    public static readonly BillingWebhookEventSixDataScope User = new(Values.User);

    public static readonly BillingWebhookEventSixDataScope Project = new(Values.Project);

    public static readonly BillingWebhookEventSixDataScope ApiKey = new(Values.ApiKey);

    public BillingWebhookEventSixDataScope(string value)
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
    public static BillingWebhookEventSixDataScope FromCustom(string value)
    {
        return new BillingWebhookEventSixDataScope(value);
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

    public static bool operator ==(BillingWebhookEventSixDataScope value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(BillingWebhookEventSixDataScope value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(BillingWebhookEventSixDataScope value) => value.Value;

    public static explicit operator BillingWebhookEventSixDataScope(string value) => new(value);

    internal class BillingWebhookEventSixDataScopeSerializer
        : JsonConverter<BillingWebhookEventSixDataScope>
    {
        public override BillingWebhookEventSixDataScope Read(
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
            return new BillingWebhookEventSixDataScope(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            BillingWebhookEventSixDataScope value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override BillingWebhookEventSixDataScope ReadAsPropertyName(
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
            return new BillingWebhookEventSixDataScope(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            BillingWebhookEventSixDataScope value,
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
        public const string User = "user";

        public const string Project = "project";

        public const string ApiKey = "api_key";
    }
}
