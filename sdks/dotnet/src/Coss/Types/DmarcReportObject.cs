using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(DmarcReportObject.DmarcReportObjectSerializer))]
[Serializable]
public readonly record struct DmarcReportObject : IStringEnum
{
    public static readonly DmarcReportObject DmarcReport = new(Values.DmarcReport);

    public DmarcReportObject(string value)
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
    public static DmarcReportObject FromCustom(string value)
    {
        return new DmarcReportObject(value);
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

    public static bool operator ==(DmarcReportObject value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(DmarcReportObject value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(DmarcReportObject value) => value.Value;

    public static explicit operator DmarcReportObject(string value) => new(value);

    internal class DmarcReportObjectSerializer : JsonConverter<DmarcReportObject>
    {
        public override DmarcReportObject Read(
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
            return new DmarcReportObject(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            DmarcReportObject value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override DmarcReportObject ReadAsPropertyName(
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
            return new DmarcReportObject(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            DmarcReportObject value,
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
