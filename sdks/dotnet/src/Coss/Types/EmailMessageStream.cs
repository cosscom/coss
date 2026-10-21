using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(EmailMessageStream.EmailMessageStreamSerializer))]
[Serializable]
public readonly record struct EmailMessageStream : IStringEnum
{
    public static readonly EmailMessageStream Transactional = new(Values.Transactional);

    public static readonly EmailMessageStream Marketing = new(Values.Marketing);

    public EmailMessageStream(string value)
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
    public static EmailMessageStream FromCustom(string value)
    {
        return new EmailMessageStream(value);
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

    public static bool operator ==(EmailMessageStream value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(EmailMessageStream value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(EmailMessageStream value) => value.Value;

    public static explicit operator EmailMessageStream(string value) => new(value);

    internal class EmailMessageStreamSerializer : JsonConverter<EmailMessageStream>
    {
        public override EmailMessageStream Read(
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
            return new EmailMessageStream(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            EmailMessageStream value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override EmailMessageStream ReadAsPropertyName(
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
            return new EmailMessageStream(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            EmailMessageStream value,
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
