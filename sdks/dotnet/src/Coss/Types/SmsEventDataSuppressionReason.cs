using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(SmsEventDataSuppressionReason.SmsEventDataSuppressionReasonSerializer))]
[Serializable]
public readonly record struct SmsEventDataSuppressionReason : IStringEnum
{
    public static readonly SmsEventDataSuppressionReason OptOut = new(Values.OptOut);

    public static readonly SmsEventDataSuppressionReason Manual = new(Values.Manual);

    public static readonly SmsEventDataSuppressionReason InvalidNumber = new(Values.InvalidNumber);

    public SmsEventDataSuppressionReason(string value)
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
    public static SmsEventDataSuppressionReason FromCustom(string value)
    {
        return new SmsEventDataSuppressionReason(value);
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

    public static bool operator ==(SmsEventDataSuppressionReason value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(SmsEventDataSuppressionReason value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(SmsEventDataSuppressionReason value) => value.Value;

    public static explicit operator SmsEventDataSuppressionReason(string value) => new(value);

    internal class SmsEventDataSuppressionReasonSerializer
        : JsonConverter<SmsEventDataSuppressionReason>
    {
        public override SmsEventDataSuppressionReason Read(
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
            return new SmsEventDataSuppressionReason(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            SmsEventDataSuppressionReason value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override SmsEventDataSuppressionReason ReadAsPropertyName(
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
            return new SmsEventDataSuppressionReason(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            SmsEventDataSuppressionReason value,
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
        public const string OptOut = "opt_out";

        public const string Manual = "manual";

        public const string InvalidNumber = "invalid_number";
    }
}
