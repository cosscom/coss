using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(
    typeof(CreateWebhookEndpointRequestApiVersion.CreateWebhookEndpointRequestApiVersionSerializer)
)]
[Serializable]
public readonly record struct CreateWebhookEndpointRequestApiVersion : IStringEnum
{
    public static readonly CreateWebhookEndpointRequestApiVersion TwoThousandTwentySix1010 = new(
        Values.TwoThousandTwentySix1010
    );

    public CreateWebhookEndpointRequestApiVersion(string value)
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
    public static CreateWebhookEndpointRequestApiVersion FromCustom(string value)
    {
        return new CreateWebhookEndpointRequestApiVersion(value);
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

    public static bool operator ==(CreateWebhookEndpointRequestApiVersion value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(CreateWebhookEndpointRequestApiVersion value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(CreateWebhookEndpointRequestApiVersion value) =>
        value.Value;

    public static explicit operator CreateWebhookEndpointRequestApiVersion(string value) =>
        new(value);

    internal class CreateWebhookEndpointRequestApiVersionSerializer
        : JsonConverter<CreateWebhookEndpointRequestApiVersion>
    {
        public override CreateWebhookEndpointRequestApiVersion Read(
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
            return new CreateWebhookEndpointRequestApiVersion(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            CreateWebhookEndpointRequestApiVersion value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override CreateWebhookEndpointRequestApiVersion ReadAsPropertyName(
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
            return new CreateWebhookEndpointRequestApiVersion(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            CreateWebhookEndpointRequestApiVersion value,
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
        public const string TwoThousandTwentySix1010 = "2026-10-10";
    }
}
