using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(BillingOverviewStatus.BillingOverviewStatusSerializer))]
[Serializable]
public readonly record struct BillingOverviewStatus : IStringEnum
{
    public static readonly BillingOverviewStatus Active = new(Values.Active);

    public static readonly BillingOverviewStatus PastDue = new(Values.PastDue);

    public static readonly BillingOverviewStatus Delinquent = new(Values.Delinquent);

    public BillingOverviewStatus(string value)
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
    public static BillingOverviewStatus FromCustom(string value)
    {
        return new BillingOverviewStatus(value);
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

    public static bool operator ==(BillingOverviewStatus value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(BillingOverviewStatus value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(BillingOverviewStatus value) => value.Value;

    public static explicit operator BillingOverviewStatus(string value) => new(value);

    internal class BillingOverviewStatusSerializer : JsonConverter<BillingOverviewStatus>
    {
        public override BillingOverviewStatus Read(
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
            return new BillingOverviewStatus(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            BillingOverviewStatus value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override BillingOverviewStatus ReadAsPropertyName(
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
            return new BillingOverviewStatus(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            BillingOverviewStatus value,
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
        public const string Active = "active";

        public const string PastDue = "past_due";

        public const string Delinquent = "delinquent";
    }
}
