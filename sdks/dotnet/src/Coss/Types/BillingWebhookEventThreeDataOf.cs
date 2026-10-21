using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(BillingWebhookEventThreeDataOf.BillingWebhookEventThreeDataOfSerializer))]
[Serializable]
public readonly record struct BillingWebhookEventThreeDataOf : IStringEnum
{
    public static readonly BillingWebhookEventThreeDataOf Credit = new(Values.Credit);

    public static readonly BillingWebhookEventThreeDataOf Allowance = new(Values.Allowance);

    public BillingWebhookEventThreeDataOf(string value)
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
    public static BillingWebhookEventThreeDataOf FromCustom(string value)
    {
        return new BillingWebhookEventThreeDataOf(value);
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

    public static bool operator ==(BillingWebhookEventThreeDataOf value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(BillingWebhookEventThreeDataOf value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(BillingWebhookEventThreeDataOf value) => value.Value;

    public static explicit operator BillingWebhookEventThreeDataOf(string value) => new(value);

    internal class BillingWebhookEventThreeDataOfSerializer
        : JsonConverter<BillingWebhookEventThreeDataOf>
    {
        public override BillingWebhookEventThreeDataOf Read(
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
            return new BillingWebhookEventThreeDataOf(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            BillingWebhookEventThreeDataOf value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override BillingWebhookEventThreeDataOf ReadAsPropertyName(
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
            return new BillingWebhookEventThreeDataOf(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            BillingWebhookEventThreeDataOf value,
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
        public const string Credit = "credit";

        public const string Allowance = "allowance";
    }
}
