using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss.Sign;

[JsonConverter(
    typeof(CreateSignRequestRequestSignersItemDelivery.CreateSignRequestRequestSignersItemDeliverySerializer)
)]
[Serializable]
public readonly record struct CreateSignRequestRequestSignersItemDelivery : IStringEnum
{
    public static readonly CreateSignRequestRequestSignersItemDelivery Embedded = new(
        Values.Embedded
    );

    public static readonly CreateSignRequestRequestSignersItemDelivery Email = new(Values.Email);

    public CreateSignRequestRequestSignersItemDelivery(string value)
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
    public static CreateSignRequestRequestSignersItemDelivery FromCustom(string value)
    {
        return new CreateSignRequestRequestSignersItemDelivery(value);
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

    public static bool operator ==(
        CreateSignRequestRequestSignersItemDelivery value1,
        string value2
    ) => value1.Value.Equals(value2);

    public static bool operator !=(
        CreateSignRequestRequestSignersItemDelivery value1,
        string value2
    ) => !value1.Value.Equals(value2);

    public static explicit operator string(CreateSignRequestRequestSignersItemDelivery value) =>
        value.Value;

    public static explicit operator CreateSignRequestRequestSignersItemDelivery(string value) =>
        new(value);

    internal class CreateSignRequestRequestSignersItemDeliverySerializer
        : JsonConverter<CreateSignRequestRequestSignersItemDelivery>
    {
        public override CreateSignRequestRequestSignersItemDelivery Read(
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
            return new CreateSignRequestRequestSignersItemDelivery(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            CreateSignRequestRequestSignersItemDelivery value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override CreateSignRequestRequestSignersItemDelivery ReadAsPropertyName(
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
            return new CreateSignRequestRequestSignersItemDelivery(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            CreateSignRequestRequestSignersItemDelivery value,
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
        public const string Embedded = "embedded";

        public const string Email = "email";
    }
}
