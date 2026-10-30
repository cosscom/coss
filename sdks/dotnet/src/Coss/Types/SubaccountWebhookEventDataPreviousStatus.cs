using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(
    typeof(SubaccountWebhookEventDataPreviousStatus.SubaccountWebhookEventDataPreviousStatusSerializer)
)]
[Serializable]
public readonly record struct SubaccountWebhookEventDataPreviousStatus : IStringEnum
{
    public static readonly SubaccountWebhookEventDataPreviousStatus Good = new(Values.Good);

    public static readonly SubaccountWebhookEventDataPreviousStatus Warning = new(Values.Warning);

    public static readonly SubaccountWebhookEventDataPreviousStatus Paused = new(Values.Paused);

    public SubaccountWebhookEventDataPreviousStatus(string value)
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
    public static SubaccountWebhookEventDataPreviousStatus FromCustom(string value)
    {
        return new SubaccountWebhookEventDataPreviousStatus(value);
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
        SubaccountWebhookEventDataPreviousStatus value1,
        string value2
    ) => value1.Value.Equals(value2);

    public static bool operator !=(
        SubaccountWebhookEventDataPreviousStatus value1,
        string value2
    ) => !value1.Value.Equals(value2);

    public static explicit operator string(SubaccountWebhookEventDataPreviousStatus value) =>
        value.Value;

    public static explicit operator SubaccountWebhookEventDataPreviousStatus(string value) =>
        new(value);

    internal class SubaccountWebhookEventDataPreviousStatusSerializer
        : JsonConverter<SubaccountWebhookEventDataPreviousStatus>
    {
        public override SubaccountWebhookEventDataPreviousStatus Read(
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
            return new SubaccountWebhookEventDataPreviousStatus(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            SubaccountWebhookEventDataPreviousStatus value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override SubaccountWebhookEventDataPreviousStatus ReadAsPropertyName(
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
            return new SubaccountWebhookEventDataPreviousStatus(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            SubaccountWebhookEventDataPreviousStatus value,
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
