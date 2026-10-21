using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(EmailSummaryStream.EmailSummaryStreamSerializer))]
[Serializable]
public readonly record struct EmailSummaryStream : IStringEnum
{
    public static readonly EmailSummaryStream Transactional = new(Values.Transactional);

    public static readonly EmailSummaryStream Marketing = new(Values.Marketing);

    public EmailSummaryStream(string value)
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
    public static EmailSummaryStream FromCustom(string value)
    {
        return new EmailSummaryStream(value);
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

    public static bool operator ==(EmailSummaryStream value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(EmailSummaryStream value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(EmailSummaryStream value) => value.Value;

    public static explicit operator EmailSummaryStream(string value) => new(value);

    internal class EmailSummaryStreamSerializer : JsonConverter<EmailSummaryStream>
    {
        public override EmailSummaryStream Read(
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
            return new EmailSummaryStream(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            EmailSummaryStream value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override EmailSummaryStream ReadAsPropertyName(
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
            return new EmailSummaryStream(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            EmailSummaryStream value,
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
        public const string Transactional = "transactional";

        public const string Marketing = "marketing";
    }
}
