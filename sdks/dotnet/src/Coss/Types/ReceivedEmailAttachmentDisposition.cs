using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(
    typeof(ReceivedEmailAttachmentDisposition.ReceivedEmailAttachmentDispositionSerializer)
)]
[Serializable]
public readonly record struct ReceivedEmailAttachmentDisposition : IStringEnum
{
    public static readonly ReceivedEmailAttachmentDisposition Attachment = new(Values.Attachment);

    public static readonly ReceivedEmailAttachmentDisposition Inline = new(Values.Inline);

    public ReceivedEmailAttachmentDisposition(string value)
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
    public static ReceivedEmailAttachmentDisposition FromCustom(string value)
    {
        return new ReceivedEmailAttachmentDisposition(value);
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

    public static bool operator ==(ReceivedEmailAttachmentDisposition value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(ReceivedEmailAttachmentDisposition value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(ReceivedEmailAttachmentDisposition value) => value.Value;

    public static explicit operator ReceivedEmailAttachmentDisposition(string value) => new(value);

    internal class ReceivedEmailAttachmentDispositionSerializer
        : JsonConverter<ReceivedEmailAttachmentDisposition>
    {
        public override ReceivedEmailAttachmentDisposition Read(
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
            return new ReceivedEmailAttachmentDisposition(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            ReceivedEmailAttachmentDisposition value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override ReceivedEmailAttachmentDisposition ReadAsPropertyName(
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
            return new ReceivedEmailAttachmentDisposition(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            ReceivedEmailAttachmentDisposition value,
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
        public const string Attachment = "attachment";

        public const string Inline = "inline";
    }
}
