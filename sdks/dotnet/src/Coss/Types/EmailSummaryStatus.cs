using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(EmailSummaryStatus.EmailSummaryStatusSerializer))]
[Serializable]
public readonly record struct EmailSummaryStatus : IStringEnum
{
    public static readonly EmailSummaryStatus Queued = new(Values.Queued);

    public static readonly EmailSummaryStatus Sent = new(Values.Sent);

    public static readonly EmailSummaryStatus Failed = new(Values.Failed);

    public static readonly EmailSummaryStatus Scheduled = new(Values.Scheduled);

    public static readonly EmailSummaryStatus Canceled = new(Values.Canceled);

    public EmailSummaryStatus(string value)
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
    public static EmailSummaryStatus FromCustom(string value)
    {
        return new EmailSummaryStatus(value);
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

    public static bool operator ==(EmailSummaryStatus value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(EmailSummaryStatus value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(EmailSummaryStatus value) => value.Value;

    public static explicit operator EmailSummaryStatus(string value) => new(value);

    internal class EmailSummaryStatusSerializer : JsonConverter<EmailSummaryStatus>
    {
        public override EmailSummaryStatus Read(
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
            return new EmailSummaryStatus(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            EmailSummaryStatus value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override EmailSummaryStatus ReadAsPropertyName(
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
            return new EmailSummaryStatus(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            EmailSummaryStatus value,
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
