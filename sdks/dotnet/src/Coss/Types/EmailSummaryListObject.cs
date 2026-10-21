using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(EmailSummaryListObject.EmailSummaryListObjectSerializer))]
[Serializable]
public readonly record struct EmailSummaryListObject : IStringEnum
{
    public static readonly EmailSummaryListObject List = new(Values.List);

    public EmailSummaryListObject(string value)
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
    public static EmailSummaryListObject FromCustom(string value)
    {
        return new EmailSummaryListObject(value);
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

    public static bool operator ==(EmailSummaryListObject value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(EmailSummaryListObject value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(EmailSummaryListObject value) => value.Value;

    public static explicit operator EmailSummaryListObject(string value) => new(value);

    internal class EmailSummaryListObjectSerializer : JsonConverter<EmailSummaryListObject>
    {
        public override EmailSummaryListObject Read(
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
            return new EmailSummaryListObject(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            EmailSummaryListObject value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override EmailSummaryListObject ReadAsPropertyName(
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
            return new EmailSummaryListObject(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            EmailSummaryListObject value,
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
