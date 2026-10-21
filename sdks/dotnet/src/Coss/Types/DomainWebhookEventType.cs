using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(DomainWebhookEventType.DomainWebhookEventTypeSerializer))]
[Serializable]
public readonly record struct DomainWebhookEventType : IStringEnum
{
    public static readonly DomainWebhookEventType DomainDmarcReportReceived = new(
        Values.DomainDmarcReportReceived
    );

    public DomainWebhookEventType(string value)
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
    public static DomainWebhookEventType FromCustom(string value)
    {
        return new DomainWebhookEventType(value);
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

    public static bool operator ==(DomainWebhookEventType value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(DomainWebhookEventType value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(DomainWebhookEventType value) => value.Value;

    public static explicit operator DomainWebhookEventType(string value) => new(value);

    internal class DomainWebhookEventTypeSerializer : JsonConverter<DomainWebhookEventType>
    {
        public override DomainWebhookEventType Read(
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
            return new DomainWebhookEventType(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            DomainWebhookEventType value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override DomainWebhookEventType ReadAsPropertyName(
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
            return new DomainWebhookEventType(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            DomainWebhookEventType value,
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
        public const string DomainDmarcReportReceived = "domain.dmarc_report_received";
    }
}
