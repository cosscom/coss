using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(EmailLinkObject.EmailLinkObjectSerializer))]
[Serializable]
public readonly record struct EmailLinkObject : IStringEnum
{
    public static readonly EmailLinkObject EmailLink = new(Values.EmailLink);

    public EmailLinkObject(string value)
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
    public static EmailLinkObject FromCustom(string value)
    {
        return new EmailLinkObject(value);
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

    public static bool operator ==(EmailLinkObject value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(EmailLinkObject value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(EmailLinkObject value) => value.Value;

    public static explicit operator EmailLinkObject(string value) => new(value);

    internal class EmailLinkObjectSerializer : JsonConverter<EmailLinkObject>
    {
        public override EmailLinkObject Read(
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
            return new EmailLinkObject(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            EmailLinkObject value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override EmailLinkObject ReadAsPropertyName(
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
            return new EmailLinkObject(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            EmailLinkObject value,
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
        public const string EmailLink = "email_link";
    }
}
