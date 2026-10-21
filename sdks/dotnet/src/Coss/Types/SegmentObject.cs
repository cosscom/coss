using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(SegmentObject.SegmentObjectSerializer))]
[Serializable]
public readonly record struct SegmentObject : IStringEnum
{
    public static readonly SegmentObject Segment = new(Values.Segment);

    public SegmentObject(string value)
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
    public static SegmentObject FromCustom(string value)
    {
        return new SegmentObject(value);
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

    public static bool operator ==(SegmentObject value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(SegmentObject value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(SegmentObject value) => value.Value;

    public static explicit operator SegmentObject(string value) => new(value);

    internal class SegmentObjectSerializer : JsonConverter<SegmentObject>
    {
        public override SegmentObject Read(
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
            return new SegmentObject(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            SegmentObject value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override SegmentObject ReadAsPropertyName(
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
            return new SegmentObject(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            SegmentObject value,
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
        public const string Segment = "segment";
    }
}
