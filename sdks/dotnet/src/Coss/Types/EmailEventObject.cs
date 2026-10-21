using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(EmailEventObject.EmailEventObjectSerializer))]
[Serializable]
public readonly record struct EmailEventObject : IStringEnum
{
    public static readonly EmailEventObject EmailEvent = new(Values.EmailEvent);

    public EmailEventObject(string value)
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
    public static EmailEventObject FromCustom(string value)
    {
        return new EmailEventObject(value);
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

    public static bool operator ==(EmailEventObject value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(EmailEventObject value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(EmailEventObject value) => value.Value;

    public static explicit operator EmailEventObject(string value) => new(value);

    internal class EmailEventObjectSerializer : JsonConverter<EmailEventObject>
    {
        public override EmailEventObject Read(
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
            return new EmailEventObject(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            EmailEventObject value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override EmailEventObject ReadAsPropertyName(
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
            return new EmailEventObject(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            EmailEventObject value,
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
        public const string EmailEvent = "email_event";
    }
}
