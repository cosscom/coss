using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(
    typeof(SegmentFilterConditionsItemConditionsConditionsItemTopicOp.SegmentFilterConditionsItemConditionsConditionsItemTopicOpSerializer)
)]
[Serializable]
public readonly record struct SegmentFilterConditionsItemConditionsConditionsItemTopicOp
    : IStringEnum
{
    public static readonly SegmentFilterConditionsItemConditionsConditionsItemTopicOp Subscribed =
        new(Values.Subscribed);

    public static readonly SegmentFilterConditionsItemConditionsConditionsItemTopicOp NotSubscribed =
        new(Values.NotSubscribed);

    public SegmentFilterConditionsItemConditionsConditionsItemTopicOp(string value)
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
    public static SegmentFilterConditionsItemConditionsConditionsItemTopicOp FromCustom(
        string value
    )
    {
        return new SegmentFilterConditionsItemConditionsConditionsItemTopicOp(value);
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

    public static bool operator ==(
        SegmentFilterConditionsItemConditionsConditionsItemTopicOp value1,
        string value2
    ) => value1.Value.Equals(value2);

    public static bool operator !=(
        SegmentFilterConditionsItemConditionsConditionsItemTopicOp value1,
        string value2
    ) => !value1.Value.Equals(value2);

    public static explicit operator string(
        SegmentFilterConditionsItemConditionsConditionsItemTopicOp value
    ) => value.Value;

    public static explicit operator SegmentFilterConditionsItemConditionsConditionsItemTopicOp(
        string value
    ) => new(value);

    internal class SegmentFilterConditionsItemConditionsConditionsItemTopicOpSerializer
        : JsonConverter<SegmentFilterConditionsItemConditionsConditionsItemTopicOp>
    {
        public override SegmentFilterConditionsItemConditionsConditionsItemTopicOp Read(
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
            return new SegmentFilterConditionsItemConditionsConditionsItemTopicOp(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            SegmentFilterConditionsItemConditionsConditionsItemTopicOp value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override SegmentFilterConditionsItemConditionsConditionsItemTopicOp ReadAsPropertyName(
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
            return new SegmentFilterConditionsItemConditionsConditionsItemTopicOp(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            SegmentFilterConditionsItemConditionsConditionsItemTopicOp value,
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
