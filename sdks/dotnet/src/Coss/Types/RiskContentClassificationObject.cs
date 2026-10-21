using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(RiskContentClassificationObject.RiskContentClassificationObjectSerializer))]
[Serializable]
public readonly record struct RiskContentClassificationObject : IStringEnum
{
    public static readonly RiskContentClassificationObject RiskContentClassification = new(
        Values.RiskContentClassification
    );

    public RiskContentClassificationObject(string value)
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
    public static RiskContentClassificationObject FromCustom(string value)
    {
        return new RiskContentClassificationObject(value);
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

    public static bool operator ==(RiskContentClassificationObject value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(RiskContentClassificationObject value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(RiskContentClassificationObject value) => value.Value;

    public static explicit operator RiskContentClassificationObject(string value) => new(value);

    internal class RiskContentClassificationObjectSerializer
        : JsonConverter<RiskContentClassificationObject>
    {
        public override RiskContentClassificationObject Read(
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
            return new RiskContentClassificationObject(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            RiskContentClassificationObject value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override RiskContentClassificationObject ReadAsPropertyName(
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
            return new RiskContentClassificationObject(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            RiskContentClassificationObject value,
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
        public const string RiskContentClassification = "risk_content_classification";
    }
}
