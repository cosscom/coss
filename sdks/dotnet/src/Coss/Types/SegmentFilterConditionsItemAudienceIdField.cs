using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(
    typeof(SegmentFilterConditionsItemAudienceIdField.SegmentFilterConditionsItemAudienceIdFieldSerializer)
)]
[Serializable]
public readonly record struct SegmentFilterConditionsItemAudienceIdField : IStringEnum
{
    public static readonly SegmentFilterConditionsItemAudienceIdField Audience = new(
        Values.Audience
    );

    public SegmentFilterConditionsItemAudienceIdField(string value)
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
    public static SegmentFilterConditionsItemAudienceIdField FromCustom(string value)
    {
        return new SegmentFilterConditionsItemAudienceIdField(value);
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
        SegmentFilterConditionsItemAudienceIdField value1,
        string value2
    ) => value1.Value.Equals(value2);

    public static bool operator !=(
        SegmentFilterConditionsItemAudienceIdField value1,
        string value2
    ) => !value1.Value.Equals(value2);

    public static explicit operator string(SegmentFilterConditionsItemAudienceIdField value) =>
        value.Value;

    public static explicit operator SegmentFilterConditionsItemAudienceIdField(string value) =>
        new(value);

    internal class SegmentFilterConditionsItemAudienceIdFieldSerializer
        : JsonConverter<SegmentFilterConditionsItemAudienceIdField>
    {
        public override SegmentFilterConditionsItemAudienceIdField Read(
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
            return new SegmentFilterConditionsItemAudienceIdField(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            SegmentFilterConditionsItemAudienceIdField value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override SegmentFilterConditionsItemAudienceIdField ReadAsPropertyName(
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
            return new SegmentFilterConditionsItemAudienceIdField(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            SegmentFilterConditionsItemAudienceIdField value,
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
        public const string Audience = "audience";
    }
}
