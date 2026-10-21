using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(UsageBillingRequestGranularity.UsageBillingRequestGranularitySerializer))]
[Serializable]
public readonly record struct UsageBillingRequestGranularity : IStringEnum
{
    public static readonly UsageBillingRequestGranularity Hour = new(Values.Hour);

    public static readonly UsageBillingRequestGranularity Day = new(Values.Day);

    public static readonly UsageBillingRequestGranularity Month = new(Values.Month);

    public UsageBillingRequestGranularity(string value)
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
    public static UsageBillingRequestGranularity FromCustom(string value)
    {
        return new UsageBillingRequestGranularity(value);
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

    public static bool operator ==(UsageBillingRequestGranularity value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(UsageBillingRequestGranularity value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(UsageBillingRequestGranularity value) => value.Value;

    public static explicit operator UsageBillingRequestGranularity(string value) => new(value);

    internal class UsageBillingRequestGranularitySerializer
        : JsonConverter<UsageBillingRequestGranularity>
    {
        public override UsageBillingRequestGranularity Read(
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
            return new UsageBillingRequestGranularity(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            UsageBillingRequestGranularity value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override UsageBillingRequestGranularity ReadAsPropertyName(
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
            return new UsageBillingRequestGranularity(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            UsageBillingRequestGranularity value,
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
        public const string Hour = "hour";

        public const string Day = "day";

        public const string Month = "month";
    }
}
