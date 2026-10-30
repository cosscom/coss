using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(InboxMessageSummaryStatus.InboxMessageSummaryStatusSerializer))]
[Serializable]
public readonly record struct InboxMessageSummaryStatus : IStringEnum
{
    public static readonly InboxMessageSummaryStatus Received = new(Values.Received);

    public static readonly InboxMessageSummaryStatus Queued = new(Values.Queued);

    public static readonly InboxMessageSummaryStatus Sent = new(Values.Sent);

    public static readonly InboxMessageSummaryStatus Failed = new(Values.Failed);

    public static readonly InboxMessageSummaryStatus Scheduled = new(Values.Scheduled);

    public static readonly InboxMessageSummaryStatus Canceled = new(Values.Canceled);

    public InboxMessageSummaryStatus(string value)
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
    public static InboxMessageSummaryStatus FromCustom(string value)
    {
        return new InboxMessageSummaryStatus(value);
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

    public static bool operator ==(InboxMessageSummaryStatus value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(InboxMessageSummaryStatus value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(InboxMessageSummaryStatus value) => value.Value;

    public static explicit operator InboxMessageSummaryStatus(string value) => new(value);

    internal class InboxMessageSummaryStatusSerializer : JsonConverter<InboxMessageSummaryStatus>
    {
        public override InboxMessageSummaryStatus Read(
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
            return new InboxMessageSummaryStatus(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            InboxMessageSummaryStatus value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override InboxMessageSummaryStatus ReadAsPropertyName(
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
            return new InboxMessageSummaryStatus(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            InboxMessageSummaryStatus value,
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
        public const string Received = "received";

        public const string Queued = "queued";

        public const string Sent = "sent";

        public const string Failed = "failed";

        public const string Scheduled = "scheduled";

        public const string Canceled = "canceled";
    }
}
