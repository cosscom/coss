using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(DeletedEmailTemplateObject.DeletedEmailTemplateObjectSerializer))]
[Serializable]
public readonly record struct DeletedEmailTemplateObject : IStringEnum
{
    public static readonly DeletedEmailTemplateObject EmailTemplate = new(Values.EmailTemplate);

    public DeletedEmailTemplateObject(string value)
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
    public static DeletedEmailTemplateObject FromCustom(string value)
    {
        return new DeletedEmailTemplateObject(value);
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

    public static bool operator ==(DeletedEmailTemplateObject value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(DeletedEmailTemplateObject value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(DeletedEmailTemplateObject value) => value.Value;

    public static explicit operator DeletedEmailTemplateObject(string value) => new(value);

    internal class DeletedEmailTemplateObjectSerializer : JsonConverter<DeletedEmailTemplateObject>
    {
        public override DeletedEmailTemplateObject Read(
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
            return new DeletedEmailTemplateObject(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            DeletedEmailTemplateObject value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override DeletedEmailTemplateObject ReadAsPropertyName(
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
            return new DeletedEmailTemplateObject(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            DeletedEmailTemplateObject value,
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
        public const string EmailTemplate = "email_template";
    }
}
