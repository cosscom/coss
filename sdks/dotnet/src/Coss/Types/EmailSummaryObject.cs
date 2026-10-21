using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(EmailSummaryObject.EmailSummaryObjectSerializer))]
[Serializable]
public readonly record struct EmailSummaryObject : IStringEnum
{
    public static readonly EmailSummaryObject Email = new(Values.Email);

    public EmailSummaryObject(string value)
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
    public static EmailSummaryObject FromCustom(string value)
    {
        return new EmailSummaryObject(value);
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

    public static bool operator ==(EmailSummaryObject value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(EmailSummaryObject value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(EmailSummaryObject value) => value.Value;

    public static explicit operator EmailSummaryObject(string value) => new(value);

    internal class EmailSummaryObjectSerializer : JsonConverter<EmailSummaryObject>
    {
        public override EmailSummaryObject Read(
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
            return new EmailSummaryObject(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            EmailSummaryObject value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override EmailSummaryObject ReadAsPropertyName(
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
            return new EmailSummaryObject(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            EmailSummaryObject value,
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
        public const string Email = "email";
    }
}
