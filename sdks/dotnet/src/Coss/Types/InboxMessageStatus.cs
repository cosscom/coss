using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(InboxMessageStatus.InboxMessageStatusSerializer))]
[Serializable]
public readonly record struct InboxMessageStatus : IStringEnum
{
    public static readonly InboxMessageStatus Received = new(Values.Received);

    public static readonly InboxMessageStatus Queued = new(Values.Queued);

    public static readonly InboxMessageStatus Sent = new(Values.Sent);

    public static readonly InboxMessageStatus Failed = new(Values.Failed);

    public static readonly InboxMessageStatus Scheduled = new(Values.Scheduled);

    public static readonly InboxMessageStatus Canceled = new(Values.Canceled);

    public InboxMessageStatus(string value)
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
    public static InboxMessageStatus FromCustom(string value)
    {
        return new InboxMessageStatus(value);
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

    public static bool operator ==(InboxMessageStatus value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(InboxMessageStatus value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(InboxMessageStatus value) => value.Value;

    public static explicit operator InboxMessageStatus(string value) => new(value);

    internal class InboxMessageStatusSerializer : JsonConverter<InboxMessageStatus>
    {
        public override InboxMessageStatus Read(
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
            return new InboxMessageStatus(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            InboxMessageStatus value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override InboxMessageStatus ReadAsPropertyName(
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
            return new InboxMessageStatus(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            InboxMessageStatus value,
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
