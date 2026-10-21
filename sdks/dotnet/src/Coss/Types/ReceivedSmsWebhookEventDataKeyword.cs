using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(
    typeof(ReceivedSmsWebhookEventDataKeyword.ReceivedSmsWebhookEventDataKeywordSerializer)
)]
[Serializable]
public readonly record struct ReceivedSmsWebhookEventDataKeyword : IStringEnum
{
    public static readonly ReceivedSmsWebhookEventDataKeyword Stop = new(Values.Stop);

    public static readonly ReceivedSmsWebhookEventDataKeyword Start = new(Values.Start);

    public static readonly ReceivedSmsWebhookEventDataKeyword Help = new(Values.Help);

    public ReceivedSmsWebhookEventDataKeyword(string value)
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
    public static ReceivedSmsWebhookEventDataKeyword FromCustom(string value)
    {
        return new ReceivedSmsWebhookEventDataKeyword(value);
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

    public static bool operator ==(ReceivedSmsWebhookEventDataKeyword value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(ReceivedSmsWebhookEventDataKeyword value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(ReceivedSmsWebhookEventDataKeyword value) => value.Value;

    public static explicit operator ReceivedSmsWebhookEventDataKeyword(string value) => new(value);

    internal class ReceivedSmsWebhookEventDataKeywordSerializer
        : JsonConverter<ReceivedSmsWebhookEventDataKeyword>
    {
        public override ReceivedSmsWebhookEventDataKeyword Read(
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
            return new ReceivedSmsWebhookEventDataKeyword(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            ReceivedSmsWebhookEventDataKeyword value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override ReceivedSmsWebhookEventDataKeyword ReadAsPropertyName(
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
            return new ReceivedSmsWebhookEventDataKeyword(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            ReceivedSmsWebhookEventDataKeyword value,
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
        public const string Stop = "stop";

        public const string Start = "start";

        public const string Help = "help";
    }
}
