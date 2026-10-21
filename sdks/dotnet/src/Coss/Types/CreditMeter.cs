using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(CreditMeter.CreditMeterSerializer))]
[Serializable]
public readonly record struct CreditMeter : IStringEnum
{
    public static readonly CreditMeter EmailRecipients = new(Values.EmailRecipients);

    public static readonly CreditMeter EmailDedicatedIp = new(Values.EmailDedicatedIp);

    public static readonly CreditMeter SmsSegments = new(Values.SmsSegments);

    public static readonly CreditMeter SmsReceivedSegments = new(Values.SmsReceivedSegments);

    public static readonly CreditMeter SmsNumbers = new(Values.SmsNumbers);

    public static readonly CreditMeter SmsRegistrations = new(Values.SmsRegistrations);

    public static readonly CreditMeter VideoParticipantMinutes = new(
        Values.VideoParticipantMinutes
    );

    public static readonly CreditMeter SchedulingBookings = new(Values.SchedulingBookings);

    public CreditMeter(string value)
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
    public static CreditMeter FromCustom(string value)
    {
        return new CreditMeter(value);
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

    public static bool operator ==(CreditMeter value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(CreditMeter value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(CreditMeter value) => value.Value;

    public static explicit operator CreditMeter(string value) => new(value);

    internal class CreditMeterSerializer : JsonConverter<CreditMeter>
    {
        public override CreditMeter Read(
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
            return new CreditMeter(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            CreditMeter value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override CreditMeter ReadAsPropertyName(
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
            return new CreditMeter(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            CreditMeter value,
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

        public const string SmsReceivedSegments = "sms.received_segments";

        public const string SmsNumbers = "sms.numbers";

        public const string SmsRegistrations = "sms.registrations";

        public const string VideoParticipantMinutes = "video.participant_minutes";

        public const string SchedulingBookings = "scheduling.bookings";
    }
}
