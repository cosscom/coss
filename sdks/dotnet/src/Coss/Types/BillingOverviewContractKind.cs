using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(BillingOverviewContractKind.BillingOverviewContractKindSerializer))]
[Serializable]
public readonly record struct BillingOverviewContractKind : IStringEnum
{
    public static readonly BillingOverviewContractKind SelfServe = new(Values.SelfServe);

    public static readonly BillingOverviewContractKind Sales = new(Values.Sales);

    public static readonly BillingOverviewContractKind Internal = new(Values.Internal);

    public BillingOverviewContractKind(string value)
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
    public static BillingOverviewContractKind FromCustom(string value)
    {
        return new BillingOverviewContractKind(value);
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

    public static bool operator ==(BillingOverviewContractKind value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(BillingOverviewContractKind value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(BillingOverviewContractKind value) => value.Value;

    public static explicit operator BillingOverviewContractKind(string value) => new(value);

    internal class BillingOverviewContractKindSerializer
        : JsonConverter<BillingOverviewContractKind>
    {
        public override BillingOverviewContractKind Read(
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
            return new BillingOverviewContractKind(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            BillingOverviewContractKind value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override BillingOverviewContractKind ReadAsPropertyName(
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
            return new BillingOverviewContractKind(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            BillingOverviewContractKind value,
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
        public const string SelfServe = "self_serve";

        public const string Sales = "sales";

        public const string Internal = "internal";
    }
}
