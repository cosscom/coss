using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(EmailTemplateVersionObject.EmailTemplateVersionObjectSerializer))]
[Serializable]
public readonly record struct EmailTemplateVersionObject : IStringEnum
{
    public static readonly EmailTemplateVersionObject EmailTemplateVersion = new(
        Values.EmailTemplateVersion
    );

    public EmailTemplateVersionObject(string value)
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
    public static EmailTemplateVersionObject FromCustom(string value)
    {
        return new EmailTemplateVersionObject(value);
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

    public static bool operator ==(EmailTemplateVersionObject value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(EmailTemplateVersionObject value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(EmailTemplateVersionObject value) => value.Value;

    public static explicit operator EmailTemplateVersionObject(string value) => new(value);

    internal class EmailTemplateVersionObjectSerializer : JsonConverter<EmailTemplateVersionObject>
    {
        public override EmailTemplateVersionObject Read(
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
            return new EmailTemplateVersionObject(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            EmailTemplateVersionObject value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override EmailTemplateVersionObject ReadAsPropertyName(
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
            return new EmailTemplateVersionObject(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            EmailTemplateVersionObject value,
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
        public const string EmailTemplateVersion = "email_template_version";
    }
}
