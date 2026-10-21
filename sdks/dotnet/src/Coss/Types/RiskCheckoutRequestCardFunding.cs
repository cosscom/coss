using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(RiskCheckoutRequestCardFunding.RiskCheckoutRequestCardFundingSerializer))]
[Serializable]
public readonly record struct RiskCheckoutRequestCardFunding : IStringEnum
{
    public static readonly RiskCheckoutRequestCardFunding Credit = new(Values.Credit);

    public static readonly RiskCheckoutRequestCardFunding Debit = new(Values.Debit);

    public static readonly RiskCheckoutRequestCardFunding Prepaid = new(Values.Prepaid);

    public static readonly RiskCheckoutRequestCardFunding Unknown = new(Values.Unknown);

    public RiskCheckoutRequestCardFunding(string value)
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
    public static RiskCheckoutRequestCardFunding FromCustom(string value)
    {
        return new RiskCheckoutRequestCardFunding(value);
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

    public static bool operator ==(RiskCheckoutRequestCardFunding value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(RiskCheckoutRequestCardFunding value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(RiskCheckoutRequestCardFunding value) => value.Value;

    public static explicit operator RiskCheckoutRequestCardFunding(string value) => new(value);

    internal class RiskCheckoutRequestCardFundingSerializer
        : JsonConverter<RiskCheckoutRequestCardFunding>
    {
        public override RiskCheckoutRequestCardFunding Read(
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
            return new RiskCheckoutRequestCardFunding(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            RiskCheckoutRequestCardFunding value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override RiskCheckoutRequestCardFunding ReadAsPropertyName(
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
            return new RiskCheckoutRequestCardFunding(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            RiskCheckoutRequestCardFunding value,
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
        public const string Credit = "credit";

        public const string Debit = "debit";

        public const string Prepaid = "prepaid";

        public const string Unknown = "unknown";
    }
}
