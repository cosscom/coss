using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(SubaccountWebhookEventObject.SubaccountWebhookEventObjectSerializer))]
[Serializable]
public readonly record struct SubaccountWebhookEventObject : IStringEnum
{
    public static readonly SubaccountWebhookEventObject Event = new(Values.Event);

    public SubaccountWebhookEventObject(string value)
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
    public static SubaccountWebhookEventObject FromCustom(string value)
    {
        return new SubaccountWebhookEventObject(value);
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

    public static bool operator ==(SubaccountWebhookEventObject value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(SubaccountWebhookEventObject value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(SubaccountWebhookEventObject value) => value.Value;

    public static explicit operator SubaccountWebhookEventObject(string value) => new(value);

    internal class SubaccountWebhookEventObjectSerializer
        : JsonConverter<SubaccountWebhookEventObject>
    {
        public override SubaccountWebhookEventObject Read(
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
            return new SubaccountWebhookEventObject(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            SubaccountWebhookEventObject value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override SubaccountWebhookEventObject ReadAsPropertyName(
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
            return new SubaccountWebhookEventObject(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            SubaccountWebhookEventObject value,
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
