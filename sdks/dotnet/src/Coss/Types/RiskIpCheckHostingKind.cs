using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(RiskIpCheckHostingKind.RiskIpCheckHostingKindSerializer))]
[Serializable]
public readonly record struct RiskIpCheckHostingKind : IStringEnum
{
    public static readonly RiskIpCheckHostingKind Cloud = new(Values.Cloud);

    public static readonly RiskIpCheckHostingKind Hosting = new(Values.Hosting);

    public static readonly RiskIpCheckHostingKind Vpn = new(Values.Vpn);

    public RiskIpCheckHostingKind(string value)
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
    public static RiskIpCheckHostingKind FromCustom(string value)
    {
        return new RiskIpCheckHostingKind(value);
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

    public static bool operator ==(RiskIpCheckHostingKind value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(RiskIpCheckHostingKind value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(RiskIpCheckHostingKind value) => value.Value;

    public static explicit operator RiskIpCheckHostingKind(string value) => new(value);

    internal class RiskIpCheckHostingKindSerializer : JsonConverter<RiskIpCheckHostingKind>
    {
        public override RiskIpCheckHostingKind Read(
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
            return new RiskIpCheckHostingKind(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            RiskIpCheckHostingKind value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override RiskIpCheckHostingKind ReadAsPropertyName(
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
            return new RiskIpCheckHostingKind(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            RiskIpCheckHostingKind value,
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
        public const string Cloud = "cloud";

        public const string Hosting = "hosting";

        public const string Vpn = "vpn";
    }
}
