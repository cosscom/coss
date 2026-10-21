using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(InvoiceLineKind.InvoiceLineKindSerializer))]
[Serializable]
public readonly record struct InvoiceLineKind : IStringEnum
{
    public static readonly InvoiceLineKind PlanFee = new(Values.PlanFee);

    public static readonly InvoiceLineKind Proration = new(Values.Proration);

    public static readonly InvoiceLineKind Usage = new(Values.Usage);

    public static readonly InvoiceLineKind Credit = new(Values.Credit);

    public static readonly InvoiceLineKind Discount = new(Values.Discount);

    public static readonly InvoiceLineKind CommitmentFee = new(Values.CommitmentFee);

    public static readonly InvoiceLineKind CommitmentShortfall = new(Values.CommitmentShortfall);

    public static readonly InvoiceLineKind AddOn = new(Values.AddOn);

    public static readonly InvoiceLineKind Adjustment = new(Values.Adjustment);

    public static readonly InvoiceLineKind WriteOff = new(Values.WriteOff);

    public InvoiceLineKind(string value)
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
    public static InvoiceLineKind FromCustom(string value)
    {
        return new InvoiceLineKind(value);
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

    public static bool operator ==(InvoiceLineKind value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(InvoiceLineKind value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(InvoiceLineKind value) => value.Value;

    public static explicit operator InvoiceLineKind(string value) => new(value);

    internal class InvoiceLineKindSerializer : JsonConverter<InvoiceLineKind>
    {
        public override InvoiceLineKind Read(
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
            return new InvoiceLineKind(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            InvoiceLineKind value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override InvoiceLineKind ReadAsPropertyName(
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
            return new InvoiceLineKind(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            InvoiceLineKind value,
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
        public const string PlanFee = "plan_fee";

        public const string Proration = "proration";

        public const string Usage = "usage";

        public const string Credit = "credit";

        public const string Discount = "discount";

        public const string CommitmentFee = "commitment_fee";

        public const string CommitmentShortfall = "commitment_shortfall";

        public const string AddOn = "add_on";

        public const string Adjustment = "adjustment";

        public const string WriteOff = "write_off";
    }
}
