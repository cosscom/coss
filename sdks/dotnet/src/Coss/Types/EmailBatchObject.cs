using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(EmailBatchObject.EmailBatchObjectSerializer))]
[Serializable]
public readonly record struct EmailBatchObject : IStringEnum
{
    public static readonly EmailBatchObject EmailBatch = new(Values.EmailBatch);

    public EmailBatchObject(string value)
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
    public static EmailBatchObject FromCustom(string value)
    {
        return new EmailBatchObject(value);
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

    public static bool operator ==(EmailBatchObject value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(EmailBatchObject value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(EmailBatchObject value) => value.Value;

    public static explicit operator EmailBatchObject(string value) => new(value);

    internal class EmailBatchObjectSerializer : JsonConverter<EmailBatchObject>
    {
        public override EmailBatchObject Read(
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
            return new EmailBatchObject(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            EmailBatchObject value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override EmailBatchObject ReadAsPropertyName(
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
            return new EmailBatchObject(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            EmailBatchObject value,
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
        public const string EmailBatch = "email_batch";
    }
}
