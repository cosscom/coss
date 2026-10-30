using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(VerificationWebhookEventObject.VerificationWebhookEventObjectSerializer))]
[Serializable]
public readonly record struct VerificationWebhookEventObject : IStringEnum
{
    public static readonly VerificationWebhookEventObject Event = new(Values.Event);

    public VerificationWebhookEventObject(string value)
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
    public static VerificationWebhookEventObject FromCustom(string value)
    {
        return new VerificationWebhookEventObject(value);
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

    public static bool operator ==(VerificationWebhookEventObject value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(VerificationWebhookEventObject value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(VerificationWebhookEventObject value) => value.Value;

    public static explicit operator VerificationWebhookEventObject(string value) => new(value);

    internal class VerificationWebhookEventObjectSerializer
        : JsonConverter<VerificationWebhookEventObject>
    {
        public override VerificationWebhookEventObject Read(
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
            return new VerificationWebhookEventObject(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            VerificationWebhookEventObject value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override VerificationWebhookEventObject ReadAsPropertyName(
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
            return new VerificationWebhookEventObject(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            VerificationWebhookEventObject value,
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
