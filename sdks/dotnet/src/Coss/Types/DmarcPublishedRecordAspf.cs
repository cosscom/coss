using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(DmarcPublishedRecordAspf.DmarcPublishedRecordAspfSerializer))]
[Serializable]
public readonly record struct DmarcPublishedRecordAspf : IStringEnum
{
    public static readonly DmarcPublishedRecordAspf R = new(Values.R);

    public static readonly DmarcPublishedRecordAspf S = new(Values.S);

    public DmarcPublishedRecordAspf(string value)
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
    public static DmarcPublishedRecordAspf FromCustom(string value)
    {
        return new DmarcPublishedRecordAspf(value);
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

    public static bool operator ==(DmarcPublishedRecordAspf value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(DmarcPublishedRecordAspf value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(DmarcPublishedRecordAspf value) => value.Value;

    public static explicit operator DmarcPublishedRecordAspf(string value) => new(value);

    internal class DmarcPublishedRecordAspfSerializer : JsonConverter<DmarcPublishedRecordAspf>
    {
        public override DmarcPublishedRecordAspf Read(
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
            return new DmarcPublishedRecordAspf(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            DmarcPublishedRecordAspf value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override DmarcPublishedRecordAspf ReadAsPropertyName(
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
            return new DmarcPublishedRecordAspf(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            DmarcPublishedRecordAspf value,
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
        public const string R = "r";

        public const string S = "s";
    }
}
