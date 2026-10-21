using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(
    typeof(HookEndpointWithSecretDisabledReason.HookEndpointWithSecretDisabledReasonSerializer)
)]
[Serializable]
public readonly record struct HookEndpointWithSecretDisabledReason : IStringEnum
{
    public static readonly HookEndpointWithSecretDisabledReason Manual = new(Values.Manual);

    public static readonly HookEndpointWithSecretDisabledReason Failing = new(Values.Failing);

    public HookEndpointWithSecretDisabledReason(string value)
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
    public static HookEndpointWithSecretDisabledReason FromCustom(string value)
    {
        return new HookEndpointWithSecretDisabledReason(value);
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

    public static bool operator ==(HookEndpointWithSecretDisabledReason value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(HookEndpointWithSecretDisabledReason value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(HookEndpointWithSecretDisabledReason value) =>
        value.Value;

    public static explicit operator HookEndpointWithSecretDisabledReason(string value) =>
        new(value);

    internal class HookEndpointWithSecretDisabledReasonSerializer
        : JsonConverter<HookEndpointWithSecretDisabledReason>
    {
        public override HookEndpointWithSecretDisabledReason Read(
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
            return new HookEndpointWithSecretDisabledReason(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            HookEndpointWithSecretDisabledReason value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override HookEndpointWithSecretDisabledReason ReadAsPropertyName(
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
            return new HookEndpointWithSecretDisabledReason(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            HookEndpointWithSecretDisabledReason value,
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
        public const string Manual = "manual";

        public const string Failing = "failing";
    }
}
