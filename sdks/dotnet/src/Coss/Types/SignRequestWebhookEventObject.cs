using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(SignRequestWebhookEventObject.SignRequestWebhookEventObjectSerializer))]
[Serializable]
public readonly record struct SignRequestWebhookEventObject : IStringEnum
{
    public static readonly SignRequestWebhookEventObject Event = new(Values.Event);

    public SignRequestWebhookEventObject(string value)
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
    public static SignRequestWebhookEventObject FromCustom(string value)
    {
        return new SignRequestWebhookEventObject(value);
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

    public static bool operator ==(SignRequestWebhookEventObject value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(SignRequestWebhookEventObject value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(SignRequestWebhookEventObject value) => value.Value;

    public static explicit operator SignRequestWebhookEventObject(string value) => new(value);

    internal class SignRequestWebhookEventObjectSerializer
        : JsonConverter<SignRequestWebhookEventObject>
    {
        public override SignRequestWebhookEventObject Read(
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
            return new SignRequestWebhookEventObject(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            SignRequestWebhookEventObject value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override SignRequestWebhookEventObject ReadAsPropertyName(
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
            return new SignRequestWebhookEventObject(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            SignRequestWebhookEventObject value,
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
