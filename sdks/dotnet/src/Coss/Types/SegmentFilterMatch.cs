using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(SegmentFilterMatch.SegmentFilterMatchSerializer))]
[Serializable]
public readonly record struct SegmentFilterMatch : IStringEnum
{
    public static readonly SegmentFilterMatch All = new(Values.All);

    public static readonly SegmentFilterMatch Any = new(Values.Any);

    public SegmentFilterMatch(string value)
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
    public static SegmentFilterMatch FromCustom(string value)
    {
        return new SegmentFilterMatch(value);
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

    public static bool operator ==(SegmentFilterMatch value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(SegmentFilterMatch value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(SegmentFilterMatch value) => value.Value;

    public static explicit operator SegmentFilterMatch(string value) => new(value);

    internal class SegmentFilterMatchSerializer : JsonConverter<SegmentFilterMatch>
    {
        public override SegmentFilterMatch Read(
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
            return new SegmentFilterMatch(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            SegmentFilterMatch value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override SegmentFilterMatch ReadAsPropertyName(
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
            return new SegmentFilterMatch(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            SegmentFilterMatch value,
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
        public const string All = "all";

        public const string Any = "any";
    }
}
