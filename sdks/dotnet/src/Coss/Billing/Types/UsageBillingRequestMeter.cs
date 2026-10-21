using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(UsageBillingRequestMeter.UsageBillingRequestMeterSerializer))]
[Serializable]
public readonly record struct UsageBillingRequestMeter : IStringEnum
{
    public static readonly UsageBillingRequestMeter EmailRecipients = new(Values.EmailRecipients);

    public static readonly UsageBillingRequestMeter EmailDedicatedIp = new(Values.EmailDedicatedIp);

    public static readonly UsageBillingRequestMeter SmsSegments = new(Values.SmsSegments);

    public static readonly UsageBillingRequestMeter VideoParticipantMinutes = new(
        Values.VideoParticipantMinutes
    );

    public static readonly UsageBillingRequestMeter SchedulingBookings = new(
        Values.SchedulingBookings
    );

    public UsageBillingRequestMeter(string value)
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
    public static UsageBillingRequestMeter FromCustom(string value)
    {
        return new UsageBillingRequestMeter(value);
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

    public static bool operator ==(UsageBillingRequestMeter value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(UsageBillingRequestMeter value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(UsageBillingRequestMeter value) => value.Value;

    public static explicit operator UsageBillingRequestMeter(string value) => new(value);

    internal class UsageBillingRequestMeterSerializer : JsonConverter<UsageBillingRequestMeter>
    {
        public override UsageBillingRequestMeter Read(
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
            return new UsageBillingRequestMeter(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            UsageBillingRequestMeter value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override UsageBillingRequestMeter ReadAsPropertyName(
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
            return new UsageBillingRequestMeter(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            UsageBillingRequestMeter value,
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
        public const string EmailRecipients = "email.recipients";

        public const string EmailDedicatedIp = "email.dedicated_ip";

        public const string SmsSegments = "sms.segments";

        public const string VideoParticipantMinutes = "video.participant_minutes";

        public const string SchedulingBookings = "scheduling.bookings";
    }
}
