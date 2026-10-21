using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(BillingWebhookEventFourObject.BillingWebhookEventFourObjectSerializer))]
[Serializable]
public readonly record struct BillingWebhookEventFourObject : IStringEnum
{
    public static readonly BillingWebhookEventFourObject Event = new(Values.Event);

    public BillingWebhookEventFourObject(string value)
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
    public static BillingWebhookEventFourObject FromCustom(string value)
    {
        return new BillingWebhookEventFourObject(value);
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

    public static bool operator ==(BillingWebhookEventFourObject value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(BillingWebhookEventFourObject value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(BillingWebhookEventFourObject value) => value.Value;

    public static explicit operator BillingWebhookEventFourObject(string value) => new(value);

    internal class BillingWebhookEventFourObjectSerializer
        : JsonConverter<BillingWebhookEventFourObject>
    {
        public override BillingWebhookEventFourObject Read(
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
            return new BillingWebhookEventFourObject(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            BillingWebhookEventFourObject value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override BillingWebhookEventFourObject ReadAsPropertyName(
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
            return new BillingWebhookEventFourObject(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            BillingWebhookEventFourObject value,
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
        public const string Event = "event";
    }
}
