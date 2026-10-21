using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(RiskCalibrationObject.RiskCalibrationObjectSerializer))]
[Serializable]
public readonly record struct RiskCalibrationObject : IStringEnum
{
    public static readonly RiskCalibrationObject RiskCalibration = new(Values.RiskCalibration);

    public RiskCalibrationObject(string value)
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
    public static RiskCalibrationObject FromCustom(string value)
    {
        return new RiskCalibrationObject(value);
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

    public static bool operator ==(RiskCalibrationObject value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(RiskCalibrationObject value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(RiskCalibrationObject value) => value.Value;

    public static explicit operator RiskCalibrationObject(string value) => new(value);

    internal class RiskCalibrationObjectSerializer : JsonConverter<RiskCalibrationObject>
    {
        public override RiskCalibrationObject Read(
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
            return new RiskCalibrationObject(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            RiskCalibrationObject value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override RiskCalibrationObject ReadAsPropertyName(
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
            return new RiskCalibrationObject(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            RiskCalibrationObject value,
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
        public const string RiskCalibration = "risk_calibration";
    }
}
