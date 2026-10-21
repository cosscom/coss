using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(
    typeof(BillingOverviewAddOnsItemInterval.BillingOverviewAddOnsItemIntervalSerializer)
)]
[Serializable]
public readonly record struct BillingOverviewAddOnsItemInterval : IStringEnum
{
    public static readonly BillingOverviewAddOnsItemInterval Month = new(Values.Month);

    public static readonly BillingOverviewAddOnsItemInterval Quarter = new(Values.Quarter);

    public static readonly BillingOverviewAddOnsItemInterval Year = new(Values.Year);

    public BillingOverviewAddOnsItemInterval(string value)
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
    public static BillingOverviewAddOnsItemInterval FromCustom(string value)
    {
        return new BillingOverviewAddOnsItemInterval(value);
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

    public static bool operator ==(BillingOverviewAddOnsItemInterval value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(BillingOverviewAddOnsItemInterval value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(BillingOverviewAddOnsItemInterval value) => value.Value;

    public static explicit operator BillingOverviewAddOnsItemInterval(string value) => new(value);

    internal class BillingOverviewAddOnsItemIntervalSerializer
        : JsonConverter<BillingOverviewAddOnsItemInterval>
    {
        public override BillingOverviewAddOnsItemInterval Read(
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
            return new BillingOverviewAddOnsItemInterval(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            BillingOverviewAddOnsItemInterval value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override BillingOverviewAddOnsItemInterval ReadAsPropertyName(
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
            return new BillingOverviewAddOnsItemInterval(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            BillingOverviewAddOnsItemInterval value,
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
        public const string Month = "month";

        public const string Quarter = "quarter";

        public const string Year = "year";
    }
}
