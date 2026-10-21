using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(DomainDmarcObject.DomainDmarcObjectSerializer))]
[Serializable]
public readonly record struct DomainDmarcObject : IStringEnum
{
    public static readonly DomainDmarcObject DomainDmarc = new(Values.DomainDmarc);

    public DomainDmarcObject(string value)
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
    public static DomainDmarcObject FromCustom(string value)
    {
        return new DomainDmarcObject(value);
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

    public static bool operator ==(DomainDmarcObject value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(DomainDmarcObject value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(DomainDmarcObject value) => value.Value;

    public static explicit operator DomainDmarcObject(string value) => new(value);

    internal class DomainDmarcObjectSerializer : JsonConverter<DomainDmarcObject>
    {
        public override DomainDmarcObject Read(
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
            return new DomainDmarcObject(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            DomainDmarcObject value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override DomainDmarcObject ReadAsPropertyName(
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
            return new DomainDmarcObject(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            DomainDmarcObject value,
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
        public const string DomainDmarc = "domain_dmarc";
    }
}
