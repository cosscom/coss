using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(CreditKind.CreditKindSerializer))]
[Serializable]
public readonly record struct CreditKind : IStringEnum
{
    public static readonly CreditKind Amount = new(Values.Amount);

    public static readonly CreditKind Units = new(Values.Units);

    public CreditKind(string value)
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
    public static CreditKind FromCustom(string value)
    {
        return new CreditKind(value);
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

    public static bool operator ==(CreditKind value1, string value2) => value1.Value.Equals(value2);

    public static bool operator !=(CreditKind value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(CreditKind value) => value.Value;

    public static explicit operator CreditKind(string value) => new(value);

    internal class CreditKindSerializer : JsonConverter<CreditKind>
    {
        public override CreditKind Read(
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
            return new CreditKind(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            CreditKind value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override CreditKind ReadAsPropertyName(
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
            return new CreditKind(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            CreditKind value,
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
        public const string Amount = "amount";

        public const string Units = "units";
    }
}
