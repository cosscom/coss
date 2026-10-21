using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(DomainWebhookEventObject.DomainWebhookEventObjectSerializer))]
[Serializable]
public readonly record struct DomainWebhookEventObject : IStringEnum
{
    public static readonly DomainWebhookEventObject Event = new(Values.Event);

    public DomainWebhookEventObject(string value)
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
    public static DomainWebhookEventObject FromCustom(string value)
    {
        return new DomainWebhookEventObject(value);
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

    public static bool operator ==(DomainWebhookEventObject value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(DomainWebhookEventObject value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(DomainWebhookEventObject value) => value.Value;

    public static explicit operator DomainWebhookEventObject(string value) => new(value);

    internal class DomainWebhookEventObjectSerializer : JsonConverter<DomainWebhookEventObject>
    {
        public override DomainWebhookEventObject Read(
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
            return new DomainWebhookEventObject(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            DomainWebhookEventObject value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override DomainWebhookEventObject ReadAsPropertyName(
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
            return new DomainWebhookEventObject(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            DomainWebhookEventObject value,
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
