using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(EmailRecipientType.EmailRecipientTypeSerializer))]
[Serializable]
public readonly record struct EmailRecipientType : IStringEnum
{
    public static readonly EmailRecipientType To = new(Values.To);

    public static readonly EmailRecipientType Cc = new(Values.Cc);

    public static readonly EmailRecipientType Bcc = new(Values.Bcc);

    public EmailRecipientType(string value)
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
    public static EmailRecipientType FromCustom(string value)
    {
        return new EmailRecipientType(value);
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

    public static bool operator ==(EmailRecipientType value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(EmailRecipientType value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(EmailRecipientType value) => value.Value;

    public static explicit operator EmailRecipientType(string value) => new(value);

    internal class EmailRecipientTypeSerializer : JsonConverter<EmailRecipientType>
    {
        public override EmailRecipientType Read(
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
            return new EmailRecipientType(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            EmailRecipientType value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override EmailRecipientType ReadAsPropertyName(
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
            return new EmailRecipientType(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            EmailRecipientType value,
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
        public const string To = "to";

        public const string Cc = "cc";

        public const string Bcc = "bcc";
    }
}
