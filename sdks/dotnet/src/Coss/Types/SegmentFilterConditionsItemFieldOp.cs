using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(
    typeof(SegmentFilterConditionsItemFieldOp.SegmentFilterConditionsItemFieldOpSerializer)
)]
[Serializable]
public readonly record struct SegmentFilterConditionsItemFieldOp : IStringEnum
{
    public static readonly SegmentFilterConditionsItemFieldOp Before = new(Values.Before);

    public static readonly SegmentFilterConditionsItemFieldOp After = new(Values.After);

    public static readonly SegmentFilterConditionsItemFieldOp WithinDays = new(Values.WithinDays);

    public SegmentFilterConditionsItemFieldOp(string value)
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
    public static SegmentFilterConditionsItemFieldOp FromCustom(string value)
    {
        return new SegmentFilterConditionsItemFieldOp(value);
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

    public static bool operator ==(SegmentFilterConditionsItemFieldOp value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(SegmentFilterConditionsItemFieldOp value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(SegmentFilterConditionsItemFieldOp value) => value.Value;

    public static explicit operator SegmentFilterConditionsItemFieldOp(string value) => new(value);

    internal class SegmentFilterConditionsItemFieldOpSerializer
        : JsonConverter<SegmentFilterConditionsItemFieldOp>
    {
        public override SegmentFilterConditionsItemFieldOp Read(
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
            return new SegmentFilterConditionsItemFieldOp(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            SegmentFilterConditionsItemFieldOp value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override SegmentFilterConditionsItemFieldOp ReadAsPropertyName(
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
            return new SegmentFilterConditionsItemFieldOp(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            SegmentFilterConditionsItemFieldOp value,
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
        public const string Before = "before";

        public const string After = "after";

        public const string WithinDays = "within_days";
    }
}
