using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(SegmentListObject.SegmentListObjectSerializer))]
[Serializable]
public readonly record struct SegmentListObject : IStringEnum
{
    public static readonly SegmentListObject List = new(Values.List);

    public SegmentListObject(string value)
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
    public static SegmentListObject FromCustom(string value)
    {
        return new SegmentListObject(value);
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

    public static bool operator ==(SegmentListObject value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(SegmentListObject value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(SegmentListObject value) => value.Value;

    public static explicit operator SegmentListObject(string value) => new(value);

    internal class SegmentListObjectSerializer : JsonConverter<SegmentListObject>
    {
        public override SegmentListObject Read(
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
            return new SegmentListObject(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            SegmentListObject value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override SegmentListObject ReadAsPropertyName(
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
            return new SegmentListObject(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            SegmentListObject value,
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
