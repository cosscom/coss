using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(RiskIpCheckDegradedItem.RiskIpCheckDegradedItemSerializer))]
[Serializable]
public readonly record struct RiskIpCheckDegradedItem : IStringEnum
{
    public static readonly RiskIpCheckDegradedItem IpData = new(Values.IpData);

    public static readonly RiskIpCheckDegradedItem IpPrivacy = new(Values.IpPrivacy);

    public RiskIpCheckDegradedItem(string value)
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
    public static RiskIpCheckDegradedItem FromCustom(string value)
    {
        return new RiskIpCheckDegradedItem(value);
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

    public static bool operator ==(RiskIpCheckDegradedItem value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(RiskIpCheckDegradedItem value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(RiskIpCheckDegradedItem value) => value.Value;

    public static explicit operator RiskIpCheckDegradedItem(string value) => new(value);

    internal class RiskIpCheckDegradedItemSerializer : JsonConverter<RiskIpCheckDegradedItem>
    {
        public override RiskIpCheckDegradedItem Read(
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
            return new RiskIpCheckDegradedItem(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            RiskIpCheckDegradedItem value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override RiskIpCheckDegradedItem ReadAsPropertyName(
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
            return new RiskIpCheckDegradedItem(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            RiskIpCheckDegradedItem value,
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
        public const string IpData = "ip_data";

        public const string IpPrivacy = "ip_privacy";
    }
}
