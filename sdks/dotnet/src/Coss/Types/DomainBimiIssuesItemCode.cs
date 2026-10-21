using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(DomainBimiIssuesItemCode.DomainBimiIssuesItemCodeSerializer))]
[Serializable]
public readonly record struct DomainBimiIssuesItemCode : IStringEnum
{
    public static readonly DomainBimiIssuesItemCode DmarcMissing = new(Values.DmarcMissing);

    public static readonly DomainBimiIssuesItemCode DmarcNotEnforced = new(Values.DmarcNotEnforced);

    public static readonly DomainBimiIssuesItemCode DmarcPartial = new(Values.DmarcPartial);

    public static readonly DomainBimiIssuesItemCode RecordMultiple = new(Values.RecordMultiple);

    public static readonly DomainBimiIssuesItemCode RecordInvalid = new(Values.RecordInvalid);

    public static readonly DomainBimiIssuesItemCode LogoMissing = new(Values.LogoMissing);

    public static readonly DomainBimiIssuesItemCode LogoNotHttps = new(Values.LogoNotHttps);

    public static readonly DomainBimiIssuesItemCode CertificateMissing = new(
        Values.CertificateMissing
    );

    public static readonly DomainBimiIssuesItemCode CertificateNotHttps = new(
        Values.CertificateNotHttps
    );

    public DomainBimiIssuesItemCode(string value)
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
    public static DomainBimiIssuesItemCode FromCustom(string value)
    {
        return new DomainBimiIssuesItemCode(value);
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

    public static bool operator ==(DomainBimiIssuesItemCode value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(DomainBimiIssuesItemCode value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(DomainBimiIssuesItemCode value) => value.Value;

    public static explicit operator DomainBimiIssuesItemCode(string value) => new(value);

    internal class DomainBimiIssuesItemCodeSerializer : JsonConverter<DomainBimiIssuesItemCode>
    {
        public override DomainBimiIssuesItemCode Read(
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
            return new DomainBimiIssuesItemCode(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            DomainBimiIssuesItemCode value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override DomainBimiIssuesItemCode ReadAsPropertyName(
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
            return new DomainBimiIssuesItemCode(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            DomainBimiIssuesItemCode value,
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
        public const string DmarcMissing = "dmarc_missing";

        public const string DmarcNotEnforced = "dmarc_not_enforced";

        public const string DmarcPartial = "dmarc_partial";

        public const string RecordMultiple = "record_multiple";

        public const string RecordInvalid = "record_invalid";

        public const string LogoMissing = "logo_missing";

        public const string LogoNotHttps = "logo_not_https";

        public const string CertificateMissing = "certificate_missing";

        public const string CertificateNotHttps = "certificate_not_https";
    }
}
