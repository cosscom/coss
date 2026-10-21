using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(DmarcPublishedRecordAdkim.DmarcPublishedRecordAdkimSerializer))]
[Serializable]
public readonly record struct DmarcPublishedRecordAdkim : IStringEnum
{
    public static readonly DmarcPublishedRecordAdkim R = new(Values.R);

    public static readonly DmarcPublishedRecordAdkim S = new(Values.S);

    public DmarcPublishedRecordAdkim(string value)
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
    public static DmarcPublishedRecordAdkim FromCustom(string value)
    {
        return new DmarcPublishedRecordAdkim(value);
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

    public static bool operator ==(DmarcPublishedRecordAdkim value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(DmarcPublishedRecordAdkim value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(DmarcPublishedRecordAdkim value) => value.Value;

    public static explicit operator DmarcPublishedRecordAdkim(string value) => new(value);

    internal class DmarcPublishedRecordAdkimSerializer : JsonConverter<DmarcPublishedRecordAdkim>
    {
        public override DmarcPublishedRecordAdkim Read(
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
            return new DmarcPublishedRecordAdkim(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            DmarcPublishedRecordAdkim value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override DmarcPublishedRecordAdkim ReadAsPropertyName(
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
            return new DmarcPublishedRecordAdkim(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            DmarcPublishedRecordAdkim value,
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
