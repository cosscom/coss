using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(DomainDmarcNextPolicy.DomainDmarcNextPolicySerializer))]
[Serializable]
public readonly record struct DomainDmarcNextPolicy : IStringEnum
{
    public static readonly DomainDmarcNextPolicy None = new(Values.None);

    public static readonly DomainDmarcNextPolicy Quarantine = new(Values.Quarantine);

    public static readonly DomainDmarcNextPolicy Reject = new(Values.Reject);

    public DomainDmarcNextPolicy(string value)
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
    public static DomainDmarcNextPolicy FromCustom(string value)
    {
        return new DomainDmarcNextPolicy(value);
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

    public static bool operator ==(DomainDmarcNextPolicy value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(DomainDmarcNextPolicy value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(DomainDmarcNextPolicy value) => value.Value;

    public static explicit operator DomainDmarcNextPolicy(string value) => new(value);

    internal class DomainDmarcNextPolicySerializer : JsonConverter<DomainDmarcNextPolicy>
    {
        public override DomainDmarcNextPolicy Read(
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
            return new DomainDmarcNextPolicy(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            DomainDmarcNextPolicy value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override DomainDmarcNextPolicy ReadAsPropertyName(
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
            return new DomainDmarcNextPolicy(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            DomainDmarcNextPolicy value,
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
