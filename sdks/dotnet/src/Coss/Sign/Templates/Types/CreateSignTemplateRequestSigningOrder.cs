using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss.Sign;

[JsonConverter(
    typeof(CreateSignTemplateRequestSigningOrder.CreateSignTemplateRequestSigningOrderSerializer)
)]
[Serializable]
public readonly record struct CreateSignTemplateRequestSigningOrder : IStringEnum
{
    public static readonly CreateSignTemplateRequestSigningOrder Parallel = new(Values.Parallel);

    public static readonly CreateSignTemplateRequestSigningOrder Sequential = new(
        Values.Sequential
    );

    public CreateSignTemplateRequestSigningOrder(string value)
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
    public static CreateSignTemplateRequestSigningOrder FromCustom(string value)
    {
        return new CreateSignTemplateRequestSigningOrder(value);
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

    public static bool operator ==(CreateSignTemplateRequestSigningOrder value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(CreateSignTemplateRequestSigningOrder value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(CreateSignTemplateRequestSigningOrder value) =>
        value.Value;

    public static explicit operator CreateSignTemplateRequestSigningOrder(string value) =>
        new(value);

    internal class CreateSignTemplateRequestSigningOrderSerializer
        : JsonConverter<CreateSignTemplateRequestSigningOrder>
    {
        public override CreateSignTemplateRequestSigningOrder Read(
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
            return new CreateSignTemplateRequestSigningOrder(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            CreateSignTemplateRequestSigningOrder value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override CreateSignTemplateRequestSigningOrder ReadAsPropertyName(
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
            return new CreateSignTemplateRequestSigningOrder(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            CreateSignTemplateRequestSigningOrder value,
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
