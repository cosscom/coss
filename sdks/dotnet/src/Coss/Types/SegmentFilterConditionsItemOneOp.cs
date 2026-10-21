using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(SegmentFilterConditionsItemOneOp.SegmentFilterConditionsItemOneOpSerializer))]
[Serializable]
public readonly record struct SegmentFilterConditionsItemOneOp : IStringEnum
{
    public static readonly SegmentFilterConditionsItemOneOp Eq = new(Values.Eq);

    public static readonly SegmentFilterConditionsItemOneOp EndsWith = new(Values.EndsWith);

    public static readonly SegmentFilterConditionsItemOneOp Contains = new(Values.Contains);

    public SegmentFilterConditionsItemOneOp(string value)
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
    public static SegmentFilterConditionsItemOneOp FromCustom(string value)
    {
        return new SegmentFilterConditionsItemOneOp(value);
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

    public static bool operator ==(SegmentFilterConditionsItemOneOp value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(SegmentFilterConditionsItemOneOp value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(SegmentFilterConditionsItemOneOp value) => value.Value;

    public static explicit operator SegmentFilterConditionsItemOneOp(string value) => new(value);

    internal class SegmentFilterConditionsItemOneOpSerializer
        : JsonConverter<SegmentFilterConditionsItemOneOp>
    {
        public override SegmentFilterConditionsItemOneOp Read(
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
            return new SegmentFilterConditionsItemOneOp(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            SegmentFilterConditionsItemOneOp value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override SegmentFilterConditionsItemOneOp ReadAsPropertyName(
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
            return new SegmentFilterConditionsItemOneOp(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            SegmentFilterConditionsItemOneOp value,
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
        public const string Eq = "eq";

        public const string EndsWith = "ends_with";

        public const string Contains = "contains";
    }
}
