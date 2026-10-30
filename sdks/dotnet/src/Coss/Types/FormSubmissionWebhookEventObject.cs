using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(FormSubmissionWebhookEventObject.FormSubmissionWebhookEventObjectSerializer))]
[Serializable]
public readonly record struct FormSubmissionWebhookEventObject : IStringEnum
{
    public static readonly FormSubmissionWebhookEventObject Event = new(Values.Event);

    public FormSubmissionWebhookEventObject(string value)
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
    public static FormSubmissionWebhookEventObject FromCustom(string value)
    {
        return new FormSubmissionWebhookEventObject(value);
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

    public static bool operator ==(FormSubmissionWebhookEventObject value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(FormSubmissionWebhookEventObject value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(FormSubmissionWebhookEventObject value) => value.Value;

    public static explicit operator FormSubmissionWebhookEventObject(string value) => new(value);

    internal class FormSubmissionWebhookEventObjectSerializer
        : JsonConverter<FormSubmissionWebhookEventObject>
    {
        public override FormSubmissionWebhookEventObject Read(
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
            return new FormSubmissionWebhookEventObject(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            FormSubmissionWebhookEventObject value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override FormSubmissionWebhookEventObject ReadAsPropertyName(
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
            return new FormSubmissionWebhookEventObject(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            FormSubmissionWebhookEventObject value,
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
