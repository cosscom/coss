using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(DmarcReportRecordSpf.DmarcReportRecordSpfSerializer))]
[Serializable]
public readonly record struct DmarcReportRecordSpf : IStringEnum
{
    public static readonly DmarcReportRecordSpf Pass = new(Values.Pass);

    public static readonly DmarcReportRecordSpf Fail = new(Values.Fail);

    public DmarcReportRecordSpf(string value)
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
    public static DmarcReportRecordSpf FromCustom(string value)
    {
        return new DmarcReportRecordSpf(value);
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

    public static bool operator ==(DmarcReportRecordSpf value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(DmarcReportRecordSpf value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(DmarcReportRecordSpf value) => value.Value;

    public static explicit operator DmarcReportRecordSpf(string value) => new(value);

    internal class DmarcReportRecordSpfSerializer : JsonConverter<DmarcReportRecordSpf>
    {
        public override DmarcReportRecordSpf Read(
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
            return new DmarcReportRecordSpf(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            DmarcReportRecordSpf value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override DmarcReportRecordSpf ReadAsPropertyName(
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
            return new DmarcReportRecordSpf(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            DmarcReportRecordSpf value,
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
        public const string Pass = "pass";

        public const string Fail = "fail";
    }
}
