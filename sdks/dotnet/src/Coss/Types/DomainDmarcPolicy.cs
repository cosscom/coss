using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(DomainDmarcPolicy.DomainDmarcPolicySerializer))]
[Serializable]
public readonly record struct DomainDmarcPolicy : IStringEnum
{
    public static readonly DomainDmarcPolicy None = new(Values.None);

    public static readonly DomainDmarcPolicy Quarantine = new(Values.Quarantine);

    public static readonly DomainDmarcPolicy Reject = new(Values.Reject);

    public DomainDmarcPolicy(string value)
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
    public static DomainDmarcPolicy FromCustom(string value)
    {
        return new DomainDmarcPolicy(value);
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

    public static bool operator ==(DomainDmarcPolicy value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(DomainDmarcPolicy value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(DomainDmarcPolicy value) => value.Value;

    public static explicit operator DomainDmarcPolicy(string value) => new(value);

    internal class DomainDmarcPolicySerializer : JsonConverter<DomainDmarcPolicy>
    {
        public override DomainDmarcPolicy Read(
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
            return new DomainDmarcPolicy(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            DomainDmarcPolicy value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override DomainDmarcPolicy ReadAsPropertyName(
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
            return new DomainDmarcPolicy(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            DomainDmarcPolicy value,
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
