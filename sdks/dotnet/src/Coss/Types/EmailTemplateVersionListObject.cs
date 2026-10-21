using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(EmailTemplateVersionListObject.EmailTemplateVersionListObjectSerializer))]
[Serializable]
public readonly record struct EmailTemplateVersionListObject : IStringEnum
{
    public static readonly EmailTemplateVersionListObject List = new(Values.List);

    public EmailTemplateVersionListObject(string value)
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
    public static EmailTemplateVersionListObject FromCustom(string value)
    {
        return new EmailTemplateVersionListObject(value);
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

    public static bool operator ==(EmailTemplateVersionListObject value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(EmailTemplateVersionListObject value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(EmailTemplateVersionListObject value) => value.Value;

    public static explicit operator EmailTemplateVersionListObject(string value) => new(value);

    internal class EmailTemplateVersionListObjectSerializer
        : JsonConverter<EmailTemplateVersionListObject>
    {
        public override EmailTemplateVersionListObject Read(
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
            return new EmailTemplateVersionListObject(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            EmailTemplateVersionListObject value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override EmailTemplateVersionListObject ReadAsPropertyName(
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
            return new EmailTemplateVersionListObject(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            EmailTemplateVersionListObject value,
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
        public const string List = "list";
    }
}
