using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(RiskReasonType.RiskReasonTypeSerializer))]
[Serializable]
public readonly record struct RiskReasonType : IStringEnum
{
    public static readonly RiskReasonType Email = new(Values.Email);

    public static readonly RiskReasonType Domain = new(Values.Domain);

    public static readonly RiskReasonType Ip = new(Values.Ip);

    public static readonly RiskReasonType Asn = new(Values.Asn);

    public static readonly RiskReasonType Country = new(Values.Country);

    public static readonly RiskReasonType User = new(Values.User);

    public RiskReasonType(string value)
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
    public static RiskReasonType FromCustom(string value)
    {
        return new RiskReasonType(value);
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

    public static bool operator ==(RiskReasonType value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(RiskReasonType value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(RiskReasonType value) => value.Value;

    public static explicit operator RiskReasonType(string value) => new(value);

    internal class RiskReasonTypeSerializer : JsonConverter<RiskReasonType>
    {
        public override RiskReasonType Read(
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
            return new RiskReasonType(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            RiskReasonType value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override RiskReasonType ReadAsPropertyName(
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
            return new RiskReasonType(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            RiskReasonType value,
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
        public const string Email = "email";

        public const string Domain = "domain";

        public const string Ip = "ip";

        public const string Asn = "asn";

        public const string Country = "country";

        public const string User = "user";
    }
}
