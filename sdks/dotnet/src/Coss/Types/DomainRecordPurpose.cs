using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(DomainRecordPurpose.DomainRecordPurposeSerializer))]
[Serializable]
public readonly record struct DomainRecordPurpose : IStringEnum
{
    public static readonly DomainRecordPurpose Dkim = new(Values.Dkim);

    public static readonly DomainRecordPurpose MailFromMx = new(Values.MailFromMx);

    public static readonly DomainRecordPurpose MailFromSpf = new(Values.MailFromSpf);

    public static readonly DomainRecordPurpose Dmarc = new(Values.Dmarc);

    public DomainRecordPurpose(string value)
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
    public static DomainRecordPurpose FromCustom(string value)
    {
        return new DomainRecordPurpose(value);
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

    public static bool operator ==(DomainRecordPurpose value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(DomainRecordPurpose value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(DomainRecordPurpose value) => value.Value;

    public static explicit operator DomainRecordPurpose(string value) => new(value);

    internal class DomainRecordPurposeSerializer : JsonConverter<DomainRecordPurpose>
    {
        public override DomainRecordPurpose Read(
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
            return new DomainRecordPurpose(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            DomainRecordPurpose value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override DomainRecordPurpose ReadAsPropertyName(
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
            return new DomainRecordPurpose(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            DomainRecordPurpose value,
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
        public const string Dkim = "dkim";

        public const string MailFromMx = "mail_from_mx";

        public const string MailFromSpf = "mail_from_spf";

        public const string Dmarc = "dmarc";
    }
}
