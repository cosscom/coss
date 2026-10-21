using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(EmailEventDataBounceType.EmailEventDataBounceTypeSerializer))]
[Serializable]
public readonly record struct EmailEventDataBounceType : IStringEnum
{
    public static readonly EmailEventDataBounceType Permanent = new(Values.Permanent);

    public static readonly EmailEventDataBounceType Transient = new(Values.Transient);

    public static readonly EmailEventDataBounceType Undetermined = new(Values.Undetermined);

    public EmailEventDataBounceType(string value)
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
    public static EmailEventDataBounceType FromCustom(string value)
    {
        return new EmailEventDataBounceType(value);
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

    public static bool operator ==(EmailEventDataBounceType value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(EmailEventDataBounceType value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(EmailEventDataBounceType value) => value.Value;

    public static explicit operator EmailEventDataBounceType(string value) => new(value);

    internal class EmailEventDataBounceTypeSerializer : JsonConverter<EmailEventDataBounceType>
    {
        public override EmailEventDataBounceType Read(
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
            return new EmailEventDataBounceType(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            EmailEventDataBounceType value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override EmailEventDataBounceType ReadAsPropertyName(
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
            return new EmailEventDataBounceType(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            EmailEventDataBounceType value,
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
        public const string Permanent = "permanent";

        public const string Transient = "transient";

        public const string Undetermined = "undetermined";
    }
}
