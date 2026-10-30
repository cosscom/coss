using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(RiskPhoneCheckDegradedItem.RiskPhoneCheckDegradedItemSerializer))]
[Serializable]
public readonly record struct RiskPhoneCheckDegradedItem : IStringEnum
{
    public static readonly RiskPhoneCheckDegradedItem PhoneData = new(Values.PhoneData);

    public static readonly RiskPhoneCheckDegradedItem SimSwap = new(Values.SimSwap);

    public RiskPhoneCheckDegradedItem(string value)
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
    public static RiskPhoneCheckDegradedItem FromCustom(string value)
    {
        return new RiskPhoneCheckDegradedItem(value);
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

    public static bool operator ==(RiskPhoneCheckDegradedItem value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(RiskPhoneCheckDegradedItem value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(RiskPhoneCheckDegradedItem value) => value.Value;

    public static explicit operator RiskPhoneCheckDegradedItem(string value) => new(value);

    internal class RiskPhoneCheckDegradedItemSerializer : JsonConverter<RiskPhoneCheckDegradedItem>
    {
        public override RiskPhoneCheckDegradedItem Read(
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
            return new RiskPhoneCheckDegradedItem(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            RiskPhoneCheckDegradedItem value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override RiskPhoneCheckDegradedItem ReadAsPropertyName(
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
            return new RiskPhoneCheckDegradedItem(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            RiskPhoneCheckDegradedItem value,
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
        public const string PhoneData = "phone_data";

        public const string SimSwap = "sim_swap";
    }
}
