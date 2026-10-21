using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(
    typeof(SegmentFilterConditionsItemTopicOp.SegmentFilterConditionsItemTopicOpSerializer)
)]
[Serializable]
public readonly record struct SegmentFilterConditionsItemTopicOp : IStringEnum
{
    public static readonly SegmentFilterConditionsItemTopicOp Subscribed = new(Values.Subscribed);

    public static readonly SegmentFilterConditionsItemTopicOp NotSubscribed = new(
        Values.NotSubscribed
    );

    public SegmentFilterConditionsItemTopicOp(string value)
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
    public static SegmentFilterConditionsItemTopicOp FromCustom(string value)
    {
        return new SegmentFilterConditionsItemTopicOp(value);
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

    public static bool operator ==(SegmentFilterConditionsItemTopicOp value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(SegmentFilterConditionsItemTopicOp value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(SegmentFilterConditionsItemTopicOp value) => value.Value;

    public static explicit operator SegmentFilterConditionsItemTopicOp(string value) => new(value);

    internal class SegmentFilterConditionsItemTopicOpSerializer
        : JsonConverter<SegmentFilterConditionsItemTopicOp>
    {
        public override SegmentFilterConditionsItemTopicOp Read(
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
            return new SegmentFilterConditionsItemTopicOp(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            SegmentFilterConditionsItemTopicOp value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override SegmentFilterConditionsItemTopicOp ReadAsPropertyName(
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
            return new SegmentFilterConditionsItemTopicOp(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            SegmentFilterConditionsItemTopicOp value,
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
        public const string Subscribed = "subscribed";

        public const string NotSubscribed = "not_subscribed";
    }
}
