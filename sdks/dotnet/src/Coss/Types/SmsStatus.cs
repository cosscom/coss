using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(SmsStatus.SmsStatusSerializer))]
[Serializable]
public readonly record struct SmsStatus : IStringEnum
{
    public static readonly SmsStatus Queued = new(Values.Queued);

    public static readonly SmsStatus Scheduled = new(Values.Scheduled);

    public static readonly SmsStatus Sent = new(Values.Sent);

    public static readonly SmsStatus Delivered = new(Values.Delivered);

    public static readonly SmsStatus Undelivered = new(Values.Undelivered);

    public static readonly SmsStatus Failed = new(Values.Failed);

    public static readonly SmsStatus Canceled = new(Values.Canceled);

    public SmsStatus(string value)
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
    public static SmsStatus FromCustom(string value)
    {
        return new SmsStatus(value);
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

    public static bool operator ==(SmsStatus value1, string value2) => value1.Value.Equals(value2);

    public static bool operator !=(SmsStatus value1, string value2) => !value1.Value.Equals(value2);

    public static explicit operator string(SmsStatus value) => value.Value;

    public static explicit operator SmsStatus(string value) => new(value);

    internal class SmsStatusSerializer : JsonConverter<SmsStatus>
    {
        public override SmsStatus Read(
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
            return new SmsStatus(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            SmsStatus value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override SmsStatus ReadAsPropertyName(
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
            return new SmsStatus(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            SmsStatus value,
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

        public const string Scheduled = "scheduled";

        public const string Sent = "sent";

        public const string Delivered = "delivered";

        public const string Undelivered = "undelivered";

        public const string Failed = "failed";

        public const string Canceled = "canceled";
    }
}
