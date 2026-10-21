using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(RiskIpSignalsHostingKind.RiskIpSignalsHostingKindSerializer))]
[Serializable]
public readonly record struct RiskIpSignalsHostingKind : IStringEnum
{
    public static readonly RiskIpSignalsHostingKind Cloud = new(Values.Cloud);

    public static readonly RiskIpSignalsHostingKind Hosting = new(Values.Hosting);

    public static readonly RiskIpSignalsHostingKind Vpn = new(Values.Vpn);

    public RiskIpSignalsHostingKind(string value)
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
    public static RiskIpSignalsHostingKind FromCustom(string value)
    {
        return new RiskIpSignalsHostingKind(value);
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

    public static bool operator ==(RiskIpSignalsHostingKind value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(RiskIpSignalsHostingKind value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(RiskIpSignalsHostingKind value) => value.Value;

    public static explicit operator RiskIpSignalsHostingKind(string value) => new(value);

    internal class RiskIpSignalsHostingKindSerializer : JsonConverter<RiskIpSignalsHostingKind>
    {
        public override RiskIpSignalsHostingKind Read(
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
            return new RiskIpSignalsHostingKind(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            RiskIpSignalsHostingKind value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override RiskIpSignalsHostingKind ReadAsPropertyName(
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
            return new RiskIpSignalsHostingKind(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            RiskIpSignalsHostingKind value,
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
