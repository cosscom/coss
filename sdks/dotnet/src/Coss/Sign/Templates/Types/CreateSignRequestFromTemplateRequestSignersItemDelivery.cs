using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss.Sign;

[JsonConverter(
    typeof(CreateSignRequestFromTemplateRequestSignersItemDelivery.CreateSignRequestFromTemplateRequestSignersItemDeliverySerializer)
)]
[Serializable]
public readonly record struct CreateSignRequestFromTemplateRequestSignersItemDelivery : IStringEnum
{
    public static readonly CreateSignRequestFromTemplateRequestSignersItemDelivery Embedded = new(
        Values.Embedded
    );

    public static readonly CreateSignRequestFromTemplateRequestSignersItemDelivery Email = new(
        Values.Email
    );

    public CreateSignRequestFromTemplateRequestSignersItemDelivery(string value)
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
    public static CreateSignRequestFromTemplateRequestSignersItemDelivery FromCustom(string value)
    {
        return new CreateSignRequestFromTemplateRequestSignersItemDelivery(value);
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
        CreateSignRequestFromTemplateRequestSignersItemDelivery value1,
        string value2
    ) => value1.Value.Equals(value2);

    public static bool operator !=(
        CreateSignRequestFromTemplateRequestSignersItemDelivery value1,
        string value2
    ) => !value1.Value.Equals(value2);

    public static explicit operator string(
        CreateSignRequestFromTemplateRequestSignersItemDelivery value
    ) => value.Value;

    public static explicit operator CreateSignRequestFromTemplateRequestSignersItemDelivery(
        string value
    ) => new(value);

    internal class CreateSignRequestFromTemplateRequestSignersItemDeliverySerializer
        : JsonConverter<CreateSignRequestFromTemplateRequestSignersItemDelivery>
    {
        public override CreateSignRequestFromTemplateRequestSignersItemDelivery Read(
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
            return new CreateSignRequestFromTemplateRequestSignersItemDelivery(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            CreateSignRequestFromTemplateRequestSignersItemDelivery value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override CreateSignRequestFromTemplateRequestSignersItemDelivery ReadAsPropertyName(
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
            return new CreateSignRequestFromTemplateRequestSignersItemDelivery(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            CreateSignRequestFromTemplateRequestSignersItemDelivery value,
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
