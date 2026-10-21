using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(DomainRecordType.DomainRecordTypeSerializer))]
[Serializable]
public readonly record struct DomainRecordType : IStringEnum
{
    public static readonly DomainRecordType Cname = new(Values.Cname);

    public static readonly DomainRecordType Mx = new(Values.Mx);

    public static readonly DomainRecordType Txt = new(Values.Txt);

    public DomainRecordType(string value)
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
    public static DomainRecordType FromCustom(string value)
    {
        return new DomainRecordType(value);
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

    public static bool operator ==(DomainRecordType value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(DomainRecordType value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(DomainRecordType value) => value.Value;

    public static explicit operator DomainRecordType(string value) => new(value);

    internal class DomainRecordTypeSerializer : JsonConverter<DomainRecordType>
    {
        public override DomainRecordType Read(
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
            return new DomainRecordType(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            DomainRecordType value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override DomainRecordType ReadAsPropertyName(
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
            return new DomainRecordType(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            DomainRecordType value,
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
        public const string Cname = "CNAME";

        public const string Mx = "MX";

        public const string Txt = "TXT";
    }
}
