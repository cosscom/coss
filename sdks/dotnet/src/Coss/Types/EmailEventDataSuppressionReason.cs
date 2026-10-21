using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(EmailEventDataSuppressionReason.EmailEventDataSuppressionReasonSerializer))]
[Serializable]
public readonly record struct EmailEventDataSuppressionReason : IStringEnum
{
    public static readonly EmailEventDataSuppressionReason Bounce = new(Values.Bounce);

    public static readonly EmailEventDataSuppressionReason Complaint = new(Values.Complaint);

    public static readonly EmailEventDataSuppressionReason Manual = new(Values.Manual);

    public static readonly EmailEventDataSuppressionReason Import = new(Values.Import);

    public static readonly EmailEventDataSuppressionReason Unsubscribe = new(Values.Unsubscribe);

    public EmailEventDataSuppressionReason(string value)
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
    public static EmailEventDataSuppressionReason FromCustom(string value)
    {
        return new EmailEventDataSuppressionReason(value);
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

    public static bool operator ==(EmailEventDataSuppressionReason value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(EmailEventDataSuppressionReason value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(EmailEventDataSuppressionReason value) => value.Value;

    public static explicit operator EmailEventDataSuppressionReason(string value) => new(value);

    internal class EmailEventDataSuppressionReasonSerializer
        : JsonConverter<EmailEventDataSuppressionReason>
    {
        public override EmailEventDataSuppressionReason Read(
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
            return new EmailEventDataSuppressionReason(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            EmailEventDataSuppressionReason value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override EmailEventDataSuppressionReason ReadAsPropertyName(
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
            return new EmailEventDataSuppressionReason(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            EmailEventDataSuppressionReason value,
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
        public const string Bounce = "bounce";

        public const string Complaint = "complaint";

        public const string Manual = "manual";

        public const string Import = "import";

        public const string Unsubscribe = "unsubscribe";
    }
}
