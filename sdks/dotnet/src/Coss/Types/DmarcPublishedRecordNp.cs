using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(DmarcPublishedRecordNp.DmarcPublishedRecordNpSerializer))]
[Serializable]
public readonly record struct DmarcPublishedRecordNp : IStringEnum
{
    public static readonly DmarcPublishedRecordNp None = new(Values.None);

    public static readonly DmarcPublishedRecordNp Quarantine = new(Values.Quarantine);

    public static readonly DmarcPublishedRecordNp Reject = new(Values.Reject);

    public DmarcPublishedRecordNp(string value)
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
    public static DmarcPublishedRecordNp FromCustom(string value)
    {
        return new DmarcPublishedRecordNp(value);
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

    public static bool operator ==(DmarcPublishedRecordNp value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(DmarcPublishedRecordNp value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(DmarcPublishedRecordNp value) => value.Value;

    public static explicit operator DmarcPublishedRecordNp(string value) => new(value);

    internal class DmarcPublishedRecordNpSerializer : JsonConverter<DmarcPublishedRecordNp>
    {
        public override DmarcPublishedRecordNp Read(
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
            return new DmarcPublishedRecordNp(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            DmarcPublishedRecordNp value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override DmarcPublishedRecordNp ReadAsPropertyName(
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
            return new DmarcPublishedRecordNp(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            DmarcPublishedRecordNp value,
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
