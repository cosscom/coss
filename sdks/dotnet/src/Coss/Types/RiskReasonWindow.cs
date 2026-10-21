using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(RiskReasonWindow.RiskReasonWindowSerializer))]
[Serializable]
public readonly record struct RiskReasonWindow : IStringEnum
{
    public static readonly RiskReasonWindow OneH = new(Values.OneH);

    public static readonly RiskReasonWindow TwentyFourH = new(Values.TwentyFourH);

    public RiskReasonWindow(string value)
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
    public static RiskReasonWindow FromCustom(string value)
    {
        return new RiskReasonWindow(value);
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

    public static bool operator ==(RiskReasonWindow value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(RiskReasonWindow value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(RiskReasonWindow value) => value.Value;

    public static explicit operator RiskReasonWindow(string value) => new(value);

    internal class RiskReasonWindowSerializer : JsonConverter<RiskReasonWindow>
    {
        public override RiskReasonWindow Read(
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
            return new RiskReasonWindow(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            RiskReasonWindow value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override RiskReasonWindow ReadAsPropertyName(
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
            return new RiskReasonWindow(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            RiskReasonWindow value,
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
        public const string OneH = "1h";

        public const string TwentyFourH = "24h";
    }
}
