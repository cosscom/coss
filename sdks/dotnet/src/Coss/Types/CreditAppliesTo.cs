using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(CreditAppliesTo.CreditAppliesToSerializer))]
[Serializable]
public readonly record struct CreditAppliesTo : IStringEnum
{
    public static readonly CreditAppliesTo Usage = new(Values.Usage);

    public static readonly CreditAppliesTo Any = new(Values.Any);

    public CreditAppliesTo(string value)
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
    public static CreditAppliesTo FromCustom(string value)
    {
        return new CreditAppliesTo(value);
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

    public static bool operator ==(CreditAppliesTo value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(CreditAppliesTo value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(CreditAppliesTo value) => value.Value;

    public static explicit operator CreditAppliesTo(string value) => new(value);

    internal class CreditAppliesToSerializer : JsonConverter<CreditAppliesTo>
    {
        public override CreditAppliesTo Read(
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
            return new CreditAppliesTo(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            CreditAppliesTo value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override CreditAppliesTo ReadAsPropertyName(
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
            return new CreditAppliesTo(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            CreditAppliesTo value,
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
        public const string Usage = "usage";

        public const string Any = "any";
    }
}
