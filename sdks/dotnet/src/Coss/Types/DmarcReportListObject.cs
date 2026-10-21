using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(DmarcReportListObject.DmarcReportListObjectSerializer))]
[Serializable]
public readonly record struct DmarcReportListObject : IStringEnum
{
    public static readonly DmarcReportListObject List = new(Values.List);

    public DmarcReportListObject(string value)
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
    public static DmarcReportListObject FromCustom(string value)
    {
        return new DmarcReportListObject(value);
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

    public static bool operator ==(DmarcReportListObject value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(DmarcReportListObject value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(DmarcReportListObject value) => value.Value;

    public static explicit operator DmarcReportListObject(string value) => new(value);

    internal class DmarcReportListObjectSerializer : JsonConverter<DmarcReportListObject>
    {
        public override DmarcReportListObject Read(
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
            return new DmarcReportListObject(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            DmarcReportListObject value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override DmarcReportListObject ReadAsPropertyName(
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
            return new DmarcReportListObject(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            DmarcReportListObject value,
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
        public const string List = "list";
    }
}
