using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(RiskEmailSignalsDeliverability.RiskEmailSignalsDeliverabilitySerializer))]
[Serializable]
public readonly record struct RiskEmailSignalsDeliverability : IStringEnum
{
    public static readonly RiskEmailSignalsDeliverability Deliverable = new(Values.Deliverable);

    public static readonly RiskEmailSignalsDeliverability Undeliverable = new(Values.Undeliverable);

    public static readonly RiskEmailSignalsDeliverability Unknown = new(Values.Unknown);

    public RiskEmailSignalsDeliverability(string value)
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
    public static RiskEmailSignalsDeliverability FromCustom(string value)
    {
        return new RiskEmailSignalsDeliverability(value);
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

    public static bool operator ==(RiskEmailSignalsDeliverability value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(RiskEmailSignalsDeliverability value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(RiskEmailSignalsDeliverability value) => value.Value;

    public static explicit operator RiskEmailSignalsDeliverability(string value) => new(value);

    internal class RiskEmailSignalsDeliverabilitySerializer
        : JsonConverter<RiskEmailSignalsDeliverability>
    {
        public override RiskEmailSignalsDeliverability Read(
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
            return new RiskEmailSignalsDeliverability(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            RiskEmailSignalsDeliverability value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override RiskEmailSignalsDeliverability ReadAsPropertyName(
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
            return new RiskEmailSignalsDeliverability(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            RiskEmailSignalsDeliverability value,
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
        public const string Deliverable = "deliverable";

        public const string Undeliverable = "undeliverable";

        public const string Unknown = "unknown";
    }
}
