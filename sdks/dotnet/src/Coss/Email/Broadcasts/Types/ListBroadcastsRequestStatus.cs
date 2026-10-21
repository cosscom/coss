using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss.Email;

[JsonConverter(typeof(ListBroadcastsRequestStatus.ListBroadcastsRequestStatusSerializer))]
[Serializable]
public readonly record struct ListBroadcastsRequestStatus : IStringEnum
{
    public static readonly ListBroadcastsRequestStatus Draft = new(Values.Draft);

    public static readonly ListBroadcastsRequestStatus Scheduled = new(Values.Scheduled);

    public static readonly ListBroadcastsRequestStatus Sending = new(Values.Sending);

    public static readonly ListBroadcastsRequestStatus Paused = new(Values.Paused);

    public static readonly ListBroadcastsRequestStatus Sent = new(Values.Sent);

    public static readonly ListBroadcastsRequestStatus Canceled = new(Values.Canceled);

    public static readonly ListBroadcastsRequestStatus Failed = new(Values.Failed);

    public ListBroadcastsRequestStatus(string value)
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
    public static ListBroadcastsRequestStatus FromCustom(string value)
    {
        return new ListBroadcastsRequestStatus(value);
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

    public static bool operator ==(ListBroadcastsRequestStatus value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(ListBroadcastsRequestStatus value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(ListBroadcastsRequestStatus value) => value.Value;

    public static explicit operator ListBroadcastsRequestStatus(string value) => new(value);

    internal class ListBroadcastsRequestStatusSerializer
        : JsonConverter<ListBroadcastsRequestStatus>
    {
        public override ListBroadcastsRequestStatus Read(
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
            return new ListBroadcastsRequestStatus(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            ListBroadcastsRequestStatus value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override ListBroadcastsRequestStatus ReadAsPropertyName(
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
            return new ListBroadcastsRequestStatus(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            ListBroadcastsRequestStatus value,
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
        public const string Draft = "draft";

        public const string Scheduled = "scheduled";

        public const string Sending = "sending";

        public const string Paused = "paused";

        public const string Sent = "sent";

        public const string Canceled = "canceled";

        public const string Failed = "failed";
    }
}
