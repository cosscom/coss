using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(SegmentFilterConditionsItemKeyOp.SegmentFilterConditionsItemKeyOpSerializer))]
[Serializable]
public readonly record struct SegmentFilterConditionsItemKeyOp : IStringEnum
{
    public static readonly SegmentFilterConditionsItemKeyOp Eq = new(Values.Eq);

    public static readonly SegmentFilterConditionsItemKeyOp Neq = new(Values.Neq);

    public static readonly SegmentFilterConditionsItemKeyOp In = new(Values.In);

    public static readonly SegmentFilterConditionsItemKeyOp NotIn = new(Values.NotIn);

    public static readonly SegmentFilterConditionsItemKeyOp Gt = new(Values.Gt);

    public static readonly SegmentFilterConditionsItemKeyOp Gte = new(Values.Gte);

    public static readonly SegmentFilterConditionsItemKeyOp Lt = new(Values.Lt);

    public static readonly SegmentFilterConditionsItemKeyOp Lte = new(Values.Lte);

    public static readonly SegmentFilterConditionsItemKeyOp Contains = new(Values.Contains);

    public static readonly SegmentFilterConditionsItemKeyOp StartsWith = new(Values.StartsWith);

    public static readonly SegmentFilterConditionsItemKeyOp Exists = new(Values.Exists);

    public static readonly SegmentFilterConditionsItemKeyOp NotExists = new(Values.NotExists);

    public SegmentFilterConditionsItemKeyOp(string value)
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
    public static SegmentFilterConditionsItemKeyOp FromCustom(string value)
    {
        return new SegmentFilterConditionsItemKeyOp(value);
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

    public static bool operator ==(SegmentFilterConditionsItemKeyOp value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(SegmentFilterConditionsItemKeyOp value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(SegmentFilterConditionsItemKeyOp value) => value.Value;

    public static explicit operator SegmentFilterConditionsItemKeyOp(string value) => new(value);

    internal class SegmentFilterConditionsItemKeyOpSerializer
        : JsonConverter<SegmentFilterConditionsItemKeyOp>
    {
        public override SegmentFilterConditionsItemKeyOp Read(
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
            return new SegmentFilterConditionsItemKeyOp(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            SegmentFilterConditionsItemKeyOp value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override SegmentFilterConditionsItemKeyOp ReadAsPropertyName(
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
            return new SegmentFilterConditionsItemKeyOp(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            SegmentFilterConditionsItemKeyOp value,
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

        public const string Neq = "neq";

        public const string In = "in";

        public const string NotIn = "not_in";

        public const string Gt = "gt";

        public const string Gte = "gte";

        public const string Lt = "lt";

        public const string Lte = "lte";

        public const string Contains = "contains";

        public const string StartsWith = "starts_with";

        public const string Exists = "exists";

        public const string NotExists = "not_exists";
    }
}
