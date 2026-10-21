using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(EmailMessageStatus.EmailMessageStatusSerializer))]
[Serializable]
public readonly record struct EmailMessageStatus : IStringEnum
{
    public static readonly EmailMessageStatus Queued = new(Values.Queued);

    public static readonly EmailMessageStatus Sent = new(Values.Sent);

    public static readonly EmailMessageStatus Failed = new(Values.Failed);

    public static readonly EmailMessageStatus Scheduled = new(Values.Scheduled);

    public static readonly EmailMessageStatus Canceled = new(Values.Canceled);

    public EmailMessageStatus(string value)
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
    public static EmailMessageStatus FromCustom(string value)
    {
        return new EmailMessageStatus(value);
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

    public static bool operator ==(EmailMessageStatus value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(EmailMessageStatus value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(EmailMessageStatus value) => value.Value;

    public static explicit operator EmailMessageStatus(string value) => new(value);

    internal class EmailMessageStatusSerializer : JsonConverter<EmailMessageStatus>
    {
        public override EmailMessageStatus Read(
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
            return new EmailMessageStatus(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            EmailMessageStatus value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override EmailMessageStatus ReadAsPropertyName(
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
            return new EmailMessageStatus(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            EmailMessageStatus value,
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
        public const string Queued = "queued";

        public const string Sent = "sent";

        public const string Failed = "failed";

        public const string Scheduled = "scheduled";

        public const string Canceled = "canceled";
    }
}
