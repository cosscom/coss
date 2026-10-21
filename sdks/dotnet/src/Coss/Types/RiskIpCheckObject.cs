using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(RiskIpCheckObject.RiskIpCheckObjectSerializer))]
[Serializable]
public readonly record struct RiskIpCheckObject : IStringEnum
{
    public static readonly RiskIpCheckObject RiskIpCheck = new(Values.RiskIpCheck);

    public RiskIpCheckObject(string value)
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
    public static RiskIpCheckObject FromCustom(string value)
    {
        return new RiskIpCheckObject(value);
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

    public static bool operator ==(RiskIpCheckObject value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(RiskIpCheckObject value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(RiskIpCheckObject value) => value.Value;

    public static explicit operator RiskIpCheckObject(string value) => new(value);

    internal class RiskIpCheckObjectSerializer : JsonConverter<RiskIpCheckObject>
    {
        public override RiskIpCheckObject Read(
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
            return new RiskIpCheckObject(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            RiskIpCheckObject value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override RiskIpCheckObject ReadAsPropertyName(
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
            return new RiskIpCheckObject(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            RiskIpCheckObject value,
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
        public const string RiskIpCheck = "risk_ip_check";
    }
}
