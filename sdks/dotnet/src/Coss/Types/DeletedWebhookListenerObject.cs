using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(DeletedWebhookListenerObject.DeletedWebhookListenerObjectSerializer))]
[Serializable]
public readonly record struct DeletedWebhookListenerObject : IStringEnum
{
    public static readonly DeletedWebhookListenerObject WebhookListener = new(
        Values.WebhookListener
    );

    public DeletedWebhookListenerObject(string value)
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
    public static DeletedWebhookListenerObject FromCustom(string value)
    {
        return new DeletedWebhookListenerObject(value);
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

    public static bool operator ==(DeletedWebhookListenerObject value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(DeletedWebhookListenerObject value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(DeletedWebhookListenerObject value) => value.Value;

    public static explicit operator DeletedWebhookListenerObject(string value) => new(value);

    internal class DeletedWebhookListenerObjectSerializer
        : JsonConverter<DeletedWebhookListenerObject>
    {
        public override DeletedWebhookListenerObject Read(
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
            return new DeletedWebhookListenerObject(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            DeletedWebhookListenerObject value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override DeletedWebhookListenerObject ReadAsPropertyName(
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
            return new DeletedWebhookListenerObject(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            DeletedWebhookListenerObject value,
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
        public const string WebhookListener = "webhook_listener";
    }
}
