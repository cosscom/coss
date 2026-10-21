using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(
    typeof(SegmentFilterConditionsItemConditionsConditionsItemPropertyOp.SegmentFilterConditionsItemConditionsConditionsItemPropertyOpSerializer)
)]
[Serializable]
public readonly record struct SegmentFilterConditionsItemConditionsConditionsItemPropertyOp
    : IStringEnum
{
    public static readonly SegmentFilterConditionsItemConditionsConditionsItemPropertyOp Eq = new(
        Values.Eq
    );

    public static readonly SegmentFilterConditionsItemConditionsConditionsItemPropertyOp Neq = new(
        Values.Neq
    );

    public static readonly SegmentFilterConditionsItemConditionsConditionsItemPropertyOp In = new(
        Values.In
    );

    public static readonly SegmentFilterConditionsItemConditionsConditionsItemPropertyOp NotIn =
        new(Values.NotIn);

    public static readonly SegmentFilterConditionsItemConditionsConditionsItemPropertyOp Gt = new(
        Values.Gt
    );

    public static readonly SegmentFilterConditionsItemConditionsConditionsItemPropertyOp Gte = new(
        Values.Gte
    );

    public static readonly SegmentFilterConditionsItemConditionsConditionsItemPropertyOp Lt = new(
        Values.Lt
    );

    public static readonly SegmentFilterConditionsItemConditionsConditionsItemPropertyOp Lte = new(
        Values.Lte
    );

    public static readonly SegmentFilterConditionsItemConditionsConditionsItemPropertyOp Contains =
        new(Values.Contains);

    public static readonly SegmentFilterConditionsItemConditionsConditionsItemPropertyOp StartsWith =
        new(Values.StartsWith);

    public static readonly SegmentFilterConditionsItemConditionsConditionsItemPropertyOp Exists =
        new(Values.Exists);

    public static readonly SegmentFilterConditionsItemConditionsConditionsItemPropertyOp NotExists =
        new(Values.NotExists);

    public SegmentFilterConditionsItemConditionsConditionsItemPropertyOp(string value)
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
    public static SegmentFilterConditionsItemConditionsConditionsItemPropertyOp FromCustom(
        string value
    )
    {
        return new SegmentFilterConditionsItemConditionsConditionsItemPropertyOp(value);
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
        SegmentFilterConditionsItemConditionsConditionsItemPropertyOp value1,
        string value2
    ) => value1.Value.Equals(value2);

    public static bool operator !=(
        SegmentFilterConditionsItemConditionsConditionsItemPropertyOp value1,
        string value2
    ) => !value1.Value.Equals(value2);

    public static explicit operator string(
        SegmentFilterConditionsItemConditionsConditionsItemPropertyOp value
    ) => value.Value;

    public static explicit operator SegmentFilterConditionsItemConditionsConditionsItemPropertyOp(
        string value
    ) => new(value);

    internal class SegmentFilterConditionsItemConditionsConditionsItemPropertyOpSerializer
        : JsonConverter<SegmentFilterConditionsItemConditionsConditionsItemPropertyOp>
    {
        public override SegmentFilterConditionsItemConditionsConditionsItemPropertyOp Read(
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
            return new SegmentFilterConditionsItemConditionsConditionsItemPropertyOp(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            SegmentFilterConditionsItemConditionsConditionsItemPropertyOp value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override SegmentFilterConditionsItemConditionsConditionsItemPropertyOp ReadAsPropertyName(
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
            return new SegmentFilterConditionsItemConditionsConditionsItemPropertyOp(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            SegmentFilterConditionsItemConditionsConditionsItemPropertyOp value,
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
