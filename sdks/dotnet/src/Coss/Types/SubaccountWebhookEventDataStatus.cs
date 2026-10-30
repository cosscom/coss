using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(SubaccountWebhookEventDataStatus.SubaccountWebhookEventDataStatusSerializer))]
[Serializable]
public readonly record struct SubaccountWebhookEventDataStatus : IStringEnum
{
    public static readonly SubaccountWebhookEventDataStatus Good = new(Values.Good);

    public static readonly SubaccountWebhookEventDataStatus Warning = new(Values.Warning);

    public static readonly SubaccountWebhookEventDataStatus Paused = new(Values.Paused);

    public SubaccountWebhookEventDataStatus(string value)
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
    public static SubaccountWebhookEventDataStatus FromCustom(string value)
    {
        return new SubaccountWebhookEventDataStatus(value);
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

    public static bool operator ==(SubaccountWebhookEventDataStatus value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(SubaccountWebhookEventDataStatus value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(SubaccountWebhookEventDataStatus value) => value.Value;

    public static explicit operator SubaccountWebhookEventDataStatus(string value) => new(value);

    internal class SubaccountWebhookEventDataStatusSerializer
        : JsonConverter<SubaccountWebhookEventDataStatus>
    {
        public override SubaccountWebhookEventDataStatus Read(
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
            return new SubaccountWebhookEventDataStatus(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            SubaccountWebhookEventDataStatus value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override SubaccountWebhookEventDataStatus ReadAsPropertyName(
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
            return new SubaccountWebhookEventDataStatus(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            SubaccountWebhookEventDataStatus value,
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
        public const string Good = "good";

        public const string Warning = "warning";

        public const string Paused = "paused";
    }
}
