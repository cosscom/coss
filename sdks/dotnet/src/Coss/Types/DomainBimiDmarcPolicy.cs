using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(DomainBimiDmarcPolicy.DomainBimiDmarcPolicySerializer))]
[Serializable]
public readonly record struct DomainBimiDmarcPolicy : IStringEnum
{
    public static readonly DomainBimiDmarcPolicy None = new(Values.None);

    public static readonly DomainBimiDmarcPolicy Quarantine = new(Values.Quarantine);

    public static readonly DomainBimiDmarcPolicy Reject = new(Values.Reject);

    public DomainBimiDmarcPolicy(string value)
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
    public static DomainBimiDmarcPolicy FromCustom(string value)
    {
        return new DomainBimiDmarcPolicy(value);
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

    public static bool operator ==(DomainBimiDmarcPolicy value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(DomainBimiDmarcPolicy value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(DomainBimiDmarcPolicy value) => value.Value;

    public static explicit operator DomainBimiDmarcPolicy(string value) => new(value);

    internal class DomainBimiDmarcPolicySerializer : JsonConverter<DomainBimiDmarcPolicy>
    {
        public override DomainBimiDmarcPolicy Read(
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
            return new DomainBimiDmarcPolicy(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            DomainBimiDmarcPolicy value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override DomainBimiDmarcPolicy ReadAsPropertyName(
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
            return new DomainBimiDmarcPolicy(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            DomainBimiDmarcPolicy value,
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
        public const string None = "none";

        public const string Quarantine = "quarantine";

        public const string Reject = "reject";
    }
}
