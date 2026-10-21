using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(
    typeof(SegmentFilterConditionsItemConditionsConditionsItemCreatedAtOp.SegmentFilterConditionsItemConditionsConditionsItemCreatedAtOpSerializer)
)]
[Serializable]
public readonly record struct SegmentFilterConditionsItemConditionsConditionsItemCreatedAtOp
    : IStringEnum
{
    public static readonly SegmentFilterConditionsItemConditionsConditionsItemCreatedAtOp Before =
        new(Values.Before);

    public static readonly SegmentFilterConditionsItemConditionsConditionsItemCreatedAtOp After =
        new(Values.After);

    public static readonly SegmentFilterConditionsItemConditionsConditionsItemCreatedAtOp WithinDays =
        new(Values.WithinDays);

    public SegmentFilterConditionsItemConditionsConditionsItemCreatedAtOp(string value)
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
    public static SegmentFilterConditionsItemConditionsConditionsItemCreatedAtOp FromCustom(
        string value
    )
    {
        return new SegmentFilterConditionsItemConditionsConditionsItemCreatedAtOp(value);
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
        SegmentFilterConditionsItemConditionsConditionsItemCreatedAtOp value1,
        string value2
    ) => value1.Value.Equals(value2);

    public static bool operator !=(
        SegmentFilterConditionsItemConditionsConditionsItemCreatedAtOp value1,
        string value2
    ) => !value1.Value.Equals(value2);

    public static explicit operator string(
        SegmentFilterConditionsItemConditionsConditionsItemCreatedAtOp value
    ) => value.Value;

    public static explicit operator SegmentFilterConditionsItemConditionsConditionsItemCreatedAtOp(
        string value
    ) => new(value);

    internal class SegmentFilterConditionsItemConditionsConditionsItemCreatedAtOpSerializer
        : JsonConverter<SegmentFilterConditionsItemConditionsConditionsItemCreatedAtOp>
    {
        public override SegmentFilterConditionsItemConditionsConditionsItemCreatedAtOp Read(
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
            return new SegmentFilterConditionsItemConditionsConditionsItemCreatedAtOp(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            SegmentFilterConditionsItemConditionsConditionsItemCreatedAtOp value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override SegmentFilterConditionsItemConditionsConditionsItemCreatedAtOp ReadAsPropertyName(
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
            return new SegmentFilterConditionsItemConditionsConditionsItemCreatedAtOp(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            SegmentFilterConditionsItemConditionsConditionsItemCreatedAtOp value,
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
