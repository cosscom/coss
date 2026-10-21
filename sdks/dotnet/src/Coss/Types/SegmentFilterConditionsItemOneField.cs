using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(
    typeof(SegmentFilterConditionsItemOneField.SegmentFilterConditionsItemOneFieldSerializer)
)]
[Serializable]
public readonly record struct SegmentFilterConditionsItemOneField : IStringEnum
{
    public static readonly SegmentFilterConditionsItemOneField Email = new(Values.Email);

    public SegmentFilterConditionsItemOneField(string value)
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
    public static SegmentFilterConditionsItemOneField FromCustom(string value)
    {
        return new SegmentFilterConditionsItemOneField(value);
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

    public static bool operator ==(SegmentFilterConditionsItemOneField value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(SegmentFilterConditionsItemOneField value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(SegmentFilterConditionsItemOneField value) =>
        value.Value;

    public static explicit operator SegmentFilterConditionsItemOneField(string value) => new(value);

    internal class SegmentFilterConditionsItemOneFieldSerializer
        : JsonConverter<SegmentFilterConditionsItemOneField>
    {
        public override SegmentFilterConditionsItemOneField Read(
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
            return new SegmentFilterConditionsItemOneField(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            SegmentFilterConditionsItemOneField value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override SegmentFilterConditionsItemOneField ReadAsPropertyName(
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
            return new SegmentFilterConditionsItemOneField(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            SegmentFilterConditionsItemOneField value,
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
        public const string Email = "email";
    }
}
