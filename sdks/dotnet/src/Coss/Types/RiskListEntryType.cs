using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(RiskListEntryType.RiskListEntryTypeSerializer))]
[Serializable]
public readonly record struct RiskListEntryType : IStringEnum
{
    public static readonly RiskListEntryType Email = new(Values.Email);

    public static readonly RiskListEntryType Domain = new(Values.Domain);

    public static readonly RiskListEntryType Ip = new(Values.Ip);

    public static readonly RiskListEntryType Asn = new(Values.Asn);

    public static readonly RiskListEntryType Country = new(Values.Country);

    public static readonly RiskListEntryType User = new(Values.User);

    public RiskListEntryType(string value)
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
    public static RiskListEntryType FromCustom(string value)
    {
        return new RiskListEntryType(value);
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

    public static bool operator ==(RiskListEntryType value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(RiskListEntryType value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(RiskListEntryType value) => value.Value;

    public static explicit operator RiskListEntryType(string value) => new(value);

    internal class RiskListEntryTypeSerializer : JsonConverter<RiskListEntryType>
    {
        public override RiskListEntryType Read(
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
            return new RiskListEntryType(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            RiskListEntryType value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override RiskListEntryType ReadAsPropertyName(
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
            return new RiskListEntryType(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            RiskListEntryType value,
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
