using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(BillingOverviewUsageItemMeter.BillingOverviewUsageItemMeterSerializer))]
[Serializable]
public readonly record struct BillingOverviewUsageItemMeter : IStringEnum
{
    public static readonly BillingOverviewUsageItemMeter EmailRecipients = new(
        Values.EmailRecipients
    );

    public static readonly BillingOverviewUsageItemMeter EmailDedicatedIp = new(
        Values.EmailDedicatedIp
    );

    public static readonly BillingOverviewUsageItemMeter SmsSegments = new(Values.SmsSegments);

    public static readonly BillingOverviewUsageItemMeter VideoParticipantMinutes = new(
        Values.VideoParticipantMinutes
    );

    public static readonly BillingOverviewUsageItemMeter SchedulingBookings = new(
        Values.SchedulingBookings
    );

    public BillingOverviewUsageItemMeter(string value)
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
    public static BillingOverviewUsageItemMeter FromCustom(string value)
    {
        return new BillingOverviewUsageItemMeter(value);
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

    public static bool operator ==(BillingOverviewUsageItemMeter value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(BillingOverviewUsageItemMeter value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(BillingOverviewUsageItemMeter value) => value.Value;

    public static explicit operator BillingOverviewUsageItemMeter(string value) => new(value);

    internal class BillingOverviewUsageItemMeterSerializer
        : JsonConverter<BillingOverviewUsageItemMeter>
    {
        public override BillingOverviewUsageItemMeter Read(
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
            return new BillingOverviewUsageItemMeter(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            BillingOverviewUsageItemMeter value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override BillingOverviewUsageItemMeter ReadAsPropertyName(
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
            return new BillingOverviewUsageItemMeter(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            BillingOverviewUsageItemMeter value,
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
