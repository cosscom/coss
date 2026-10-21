using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(DeletedSegmentObject.DeletedSegmentObjectSerializer))]
[Serializable]
public readonly record struct DeletedSegmentObject : IStringEnum
{
    public static readonly DeletedSegmentObject Segment = new(Values.Segment);

    public DeletedSegmentObject(string value)
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
    public static DeletedSegmentObject FromCustom(string value)
    {
        return new DeletedSegmentObject(value);
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

    public static bool operator ==(DeletedSegmentObject value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(DeletedSegmentObject value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(DeletedSegmentObject value) => value.Value;

    public static explicit operator DeletedSegmentObject(string value) => new(value);

    internal class DeletedSegmentObjectSerializer : JsonConverter<DeletedSegmentObject>
    {
        public override DeletedSegmentObject Read(
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
            return new DeletedSegmentObject(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            DeletedSegmentObject value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override DeletedSegmentObject ReadAsPropertyName(
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
            return new DeletedSegmentObject(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            DeletedSegmentObject value,
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
