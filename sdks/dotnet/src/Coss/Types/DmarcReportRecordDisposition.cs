using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(DmarcReportRecordDisposition.DmarcReportRecordDispositionSerializer))]
[Serializable]
public readonly record struct DmarcReportRecordDisposition : IStringEnum
{
    public static readonly DmarcReportRecordDisposition None = new(Values.None);

    public static readonly DmarcReportRecordDisposition Quarantine = new(Values.Quarantine);

    public static readonly DmarcReportRecordDisposition Reject = new(Values.Reject);

    public DmarcReportRecordDisposition(string value)
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
    public static DmarcReportRecordDisposition FromCustom(string value)
    {
        return new DmarcReportRecordDisposition(value);
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

    public static bool operator ==(DmarcReportRecordDisposition value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(DmarcReportRecordDisposition value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(DmarcReportRecordDisposition value) => value.Value;

    public static explicit operator DmarcReportRecordDisposition(string value) => new(value);

    internal class DmarcReportRecordDispositionSerializer
        : JsonConverter<DmarcReportRecordDisposition>
    {
        public override DmarcReportRecordDisposition Read(
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
            return new DmarcReportRecordDisposition(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            DmarcReportRecordDisposition value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override DmarcReportRecordDisposition ReadAsPropertyName(
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
            return new DmarcReportRecordDisposition(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            DmarcReportRecordDisposition value,
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
