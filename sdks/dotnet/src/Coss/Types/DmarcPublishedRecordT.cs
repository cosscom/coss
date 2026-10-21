using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(DmarcPublishedRecordT.DmarcPublishedRecordTSerializer))]
[Serializable]
public readonly record struct DmarcPublishedRecordT : IStringEnum
{
    public static readonly DmarcPublishedRecordT Y = new(Values.Y);

    public static readonly DmarcPublishedRecordT N = new(Values.N);

    public DmarcPublishedRecordT(string value)
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
    public static DmarcPublishedRecordT FromCustom(string value)
    {
        return new DmarcPublishedRecordT(value);
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

    public static bool operator ==(DmarcPublishedRecordT value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(DmarcPublishedRecordT value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(DmarcPublishedRecordT value) => value.Value;

    public static explicit operator DmarcPublishedRecordT(string value) => new(value);

    internal class DmarcPublishedRecordTSerializer : JsonConverter<DmarcPublishedRecordT>
    {
        public override DmarcPublishedRecordT Read(
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
            return new DmarcPublishedRecordT(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            DmarcPublishedRecordT value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override DmarcPublishedRecordT ReadAsPropertyName(
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
            return new DmarcPublishedRecordT(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            DmarcPublishedRecordT value,
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
        public const string Y = "y";

        public const string N = "n";
    }
}
