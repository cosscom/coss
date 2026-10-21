using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(
    typeof(CreateWebhookListenerRequestApiVersion.CreateWebhookListenerRequestApiVersionSerializer)
)]
[Serializable]
public readonly record struct CreateWebhookListenerRequestApiVersion : IStringEnum
{
    public static readonly CreateWebhookListenerRequestApiVersion TwoThousandTwentySix1010 = new(
        Values.TwoThousandTwentySix1010
    );

    public CreateWebhookListenerRequestApiVersion(string value)
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
    public static CreateWebhookListenerRequestApiVersion FromCustom(string value)
    {
        return new CreateWebhookListenerRequestApiVersion(value);
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

    public static bool operator ==(CreateWebhookListenerRequestApiVersion value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(CreateWebhookListenerRequestApiVersion value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(CreateWebhookListenerRequestApiVersion value) =>
        value.Value;

    public static explicit operator CreateWebhookListenerRequestApiVersion(string value) =>
        new(value);

    internal class CreateWebhookListenerRequestApiVersionSerializer
        : JsonConverter<CreateWebhookListenerRequestApiVersion>
    {
        public override CreateWebhookListenerRequestApiVersion Read(
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
            return new CreateWebhookListenerRequestApiVersion(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            CreateWebhookListenerRequestApiVersion value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override CreateWebhookListenerRequestApiVersion ReadAsPropertyName(
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
            return new CreateWebhookListenerRequestApiVersion(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            CreateWebhookListenerRequestApiVersion value,
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
