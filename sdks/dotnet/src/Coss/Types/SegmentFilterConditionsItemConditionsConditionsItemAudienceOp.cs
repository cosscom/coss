using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(
    typeof(SegmentFilterConditionsItemConditionsConditionsItemAudienceOp.SegmentFilterConditionsItemConditionsConditionsItemAudienceOpSerializer)
)]
[Serializable]
public readonly record struct SegmentFilterConditionsItemConditionsConditionsItemAudienceOp
    : IStringEnum
{
    public static readonly SegmentFilterConditionsItemConditionsConditionsItemAudienceOp In = new(
        Values.In
    );

    public static readonly SegmentFilterConditionsItemConditionsConditionsItemAudienceOp NotIn =
        new(Values.NotIn);

    public SegmentFilterConditionsItemConditionsConditionsItemAudienceOp(string value)
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
    public static SegmentFilterConditionsItemConditionsConditionsItemAudienceOp FromCustom(
        string value
    )
    {
        return new SegmentFilterConditionsItemConditionsConditionsItemAudienceOp(value);
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
        SegmentFilterConditionsItemConditionsConditionsItemAudienceOp value1,
        string value2
    ) => value1.Value.Equals(value2);

    public static bool operator !=(
        SegmentFilterConditionsItemConditionsConditionsItemAudienceOp value1,
        string value2
    ) => !value1.Value.Equals(value2);

    public static explicit operator string(
        SegmentFilterConditionsItemConditionsConditionsItemAudienceOp value
    ) => value.Value;

    public static explicit operator SegmentFilterConditionsItemConditionsConditionsItemAudienceOp(
        string value
    ) => new(value);

    internal class SegmentFilterConditionsItemConditionsConditionsItemAudienceOpSerializer
        : JsonConverter<SegmentFilterConditionsItemConditionsConditionsItemAudienceOp>
    {
        public override SegmentFilterConditionsItemConditionsConditionsItemAudienceOp Read(
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
            return new SegmentFilterConditionsItemConditionsConditionsItemAudienceOp(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            SegmentFilterConditionsItemConditionsConditionsItemAudienceOp value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override SegmentFilterConditionsItemConditionsConditionsItemAudienceOp ReadAsPropertyName(
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
            return new SegmentFilterConditionsItemConditionsConditionsItemAudienceOp(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            SegmentFilterConditionsItemConditionsConditionsItemAudienceOp value,
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
        public const string In = "in";

        public const string NotIn = "not_in";
    }
}
