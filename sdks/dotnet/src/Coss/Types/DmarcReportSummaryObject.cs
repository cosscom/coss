using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(DmarcReportSummaryObject.DmarcReportSummaryObjectSerializer))]
[Serializable]
public readonly record struct DmarcReportSummaryObject : IStringEnum
{
    public static readonly DmarcReportSummaryObject DmarcReport = new(Values.DmarcReport);

    public DmarcReportSummaryObject(string value)
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
    public static DmarcReportSummaryObject FromCustom(string value)
    {
        return new DmarcReportSummaryObject(value);
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

    public static bool operator ==(DmarcReportSummaryObject value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(DmarcReportSummaryObject value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(DmarcReportSummaryObject value) => value.Value;

    public static explicit operator DmarcReportSummaryObject(string value) => new(value);

    internal class DmarcReportSummaryObjectSerializer : JsonConverter<DmarcReportSummaryObject>
    {
        public override DmarcReportSummaryObject Read(
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
            return new DmarcReportSummaryObject(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            DmarcReportSummaryObject value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override DmarcReportSummaryObject ReadAsPropertyName(
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
            return new DmarcReportSummaryObject(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            DmarcReportSummaryObject value,
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
        public const string DmarcReport = "dmarc_report";
    }
}
