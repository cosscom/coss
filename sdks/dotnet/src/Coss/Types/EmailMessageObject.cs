using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(EmailMessageObject.EmailMessageObjectSerializer))]
[Serializable]
public readonly record struct EmailMessageObject : IStringEnum
{
    public static readonly EmailMessageObject Email = new(Values.Email);

    public EmailMessageObject(string value)
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
    public static EmailMessageObject FromCustom(string value)
    {
        return new EmailMessageObject(value);
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

    public static bool operator ==(EmailMessageObject value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(EmailMessageObject value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(EmailMessageObject value) => value.Value;

    public static explicit operator EmailMessageObject(string value) => new(value);

    internal class EmailMessageObjectSerializer : JsonConverter<EmailMessageObject>
    {
        public override EmailMessageObject Read(
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
            return new EmailMessageObject(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            EmailMessageObject value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override EmailMessageObject ReadAsPropertyName(
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
            return new EmailMessageObject(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            EmailMessageObject value,
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
