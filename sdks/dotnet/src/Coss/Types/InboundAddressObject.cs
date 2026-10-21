using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(InboundAddressObject.InboundAddressObjectSerializer))]
[Serializable]
public readonly record struct InboundAddressObject : IStringEnum
{
    public static readonly InboundAddressObject InboundAddress = new(Values.InboundAddress);

    public InboundAddressObject(string value)
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
    public static InboundAddressObject FromCustom(string value)
    {
        return new InboundAddressObject(value);
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

    public static bool operator ==(InboundAddressObject value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(InboundAddressObject value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(InboundAddressObject value) => value.Value;

    public static explicit operator InboundAddressObject(string value) => new(value);

    internal class InboundAddressObjectSerializer : JsonConverter<InboundAddressObject>
    {
        public override InboundAddressObject Read(
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
            return new InboundAddressObject(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            InboundAddressObject value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override InboundAddressObject ReadAsPropertyName(
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
            return new InboundAddressObject(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            InboundAddressObject value,
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
        public const string InboundAddress = "inbound_address";
    }
}
