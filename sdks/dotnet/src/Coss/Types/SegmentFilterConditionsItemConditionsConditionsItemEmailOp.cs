using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(
    typeof(SegmentFilterConditionsItemConditionsConditionsItemEmailOp.SegmentFilterConditionsItemConditionsConditionsItemEmailOpSerializer)
)]
[Serializable]
public readonly record struct SegmentFilterConditionsItemConditionsConditionsItemEmailOp
    : IStringEnum
{
    public static readonly SegmentFilterConditionsItemConditionsConditionsItemEmailOp Eq = new(
        Values.Eq
    );

    public static readonly SegmentFilterConditionsItemConditionsConditionsItemEmailOp EndsWith =
        new(Values.EndsWith);

    public static readonly SegmentFilterConditionsItemConditionsConditionsItemEmailOp Contains =
        new(Values.Contains);

    public SegmentFilterConditionsItemConditionsConditionsItemEmailOp(string value)
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
    public static SegmentFilterConditionsItemConditionsConditionsItemEmailOp FromCustom(
        string value
    )
    {
        return new SegmentFilterConditionsItemConditionsConditionsItemEmailOp(value);
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
        SegmentFilterConditionsItemConditionsConditionsItemEmailOp value1,
        string value2
    ) => value1.Value.Equals(value2);

    public static bool operator !=(
        SegmentFilterConditionsItemConditionsConditionsItemEmailOp value1,
        string value2
    ) => !value1.Value.Equals(value2);

    public static explicit operator string(
        SegmentFilterConditionsItemConditionsConditionsItemEmailOp value
    ) => value.Value;

    public static explicit operator SegmentFilterConditionsItemConditionsConditionsItemEmailOp(
        string value
    ) => new(value);

    internal class SegmentFilterConditionsItemConditionsConditionsItemEmailOpSerializer
        : JsonConverter<SegmentFilterConditionsItemConditionsConditionsItemEmailOp>
    {
        public override SegmentFilterConditionsItemConditionsConditionsItemEmailOp Read(
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
            return new SegmentFilterConditionsItemConditionsConditionsItemEmailOp(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            SegmentFilterConditionsItemConditionsConditionsItemEmailOp value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override SegmentFilterConditionsItemConditionsConditionsItemEmailOp ReadAsPropertyName(
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
            return new SegmentFilterConditionsItemConditionsConditionsItemEmailOp(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            SegmentFilterConditionsItemConditionsConditionsItemEmailOp value,
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
