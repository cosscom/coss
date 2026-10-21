using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(
    typeof(SegmentFilterConditionsItemAudienceIdOp.SegmentFilterConditionsItemAudienceIdOpSerializer)
)]
[Serializable]
public readonly record struct SegmentFilterConditionsItemAudienceIdOp : IStringEnum
{
    public static readonly SegmentFilterConditionsItemAudienceIdOp In = new(Values.In);

    public static readonly SegmentFilterConditionsItemAudienceIdOp NotIn = new(Values.NotIn);

    public SegmentFilterConditionsItemAudienceIdOp(string value)
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
    public static SegmentFilterConditionsItemAudienceIdOp FromCustom(string value)
    {
        return new SegmentFilterConditionsItemAudienceIdOp(value);
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

    public static bool operator ==(SegmentFilterConditionsItemAudienceIdOp value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(SegmentFilterConditionsItemAudienceIdOp value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(SegmentFilterConditionsItemAudienceIdOp value) =>
        value.Value;

    public static explicit operator SegmentFilterConditionsItemAudienceIdOp(string value) =>
        new(value);

    internal class SegmentFilterConditionsItemAudienceIdOpSerializer
        : JsonConverter<SegmentFilterConditionsItemAudienceIdOp>
    {
        public override SegmentFilterConditionsItemAudienceIdOp Read(
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
            return new SegmentFilterConditionsItemAudienceIdOp(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            SegmentFilterConditionsItemAudienceIdOp value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override SegmentFilterConditionsItemAudienceIdOp ReadAsPropertyName(
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
            return new SegmentFilterConditionsItemAudienceIdOp(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            SegmentFilterConditionsItemAudienceIdOp value,
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
