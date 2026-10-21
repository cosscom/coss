using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(TrackingRuleObject.TrackingRuleObjectSerializer))]
[Serializable]
public readonly record struct TrackingRuleObject : IStringEnum
{
    public static readonly TrackingRuleObject TrackingRule = new(Values.TrackingRule);

    public TrackingRuleObject(string value)
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
    public static TrackingRuleObject FromCustom(string value)
    {
        return new TrackingRuleObject(value);
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

    public static bool operator ==(TrackingRuleObject value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(TrackingRuleObject value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(TrackingRuleObject value) => value.Value;

    public static explicit operator TrackingRuleObject(string value) => new(value);

    internal class TrackingRuleObjectSerializer : JsonConverter<TrackingRuleObject>
    {
        public override TrackingRuleObject Read(
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
            return new TrackingRuleObject(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            TrackingRuleObject value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override TrackingRuleObject ReadAsPropertyName(
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
            return new TrackingRuleObject(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            TrackingRuleObject value,
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
        public const string TrackingRule = "tracking_rule";
    }
}
