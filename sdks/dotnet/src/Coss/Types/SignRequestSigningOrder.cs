using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(SignRequestSigningOrder.SignRequestSigningOrderSerializer))]
[Serializable]
public readonly record struct SignRequestSigningOrder : IStringEnum
{
    public static readonly SignRequestSigningOrder Parallel = new(Values.Parallel);

    public static readonly SignRequestSigningOrder Sequential = new(Values.Sequential);

    public SignRequestSigningOrder(string value)
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
    public static SignRequestSigningOrder FromCustom(string value)
    {
        return new SignRequestSigningOrder(value);
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

    public static bool operator ==(SignRequestSigningOrder value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(SignRequestSigningOrder value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(SignRequestSigningOrder value) => value.Value;

    public static explicit operator SignRequestSigningOrder(string value) => new(value);

    internal class SignRequestSigningOrderSerializer : JsonConverter<SignRequestSigningOrder>
    {
        public override SignRequestSigningOrder Read(
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
            return new SignRequestSigningOrder(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            SignRequestSigningOrder value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override SignRequestSigningOrder ReadAsPropertyName(
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
            return new SignRequestSigningOrder(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            SignRequestSigningOrder value,
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
        public const string Parallel = "parallel";

        public const string Sequential = "sequential";
    }
}
