using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(HookEndpointDisabledReason.HookEndpointDisabledReasonSerializer))]
[Serializable]
public readonly record struct HookEndpointDisabledReason : IStringEnum
{
    public static readonly HookEndpointDisabledReason Manual = new(Values.Manual);

    public static readonly HookEndpointDisabledReason Failing = new(Values.Failing);

    public HookEndpointDisabledReason(string value)
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
    public static HookEndpointDisabledReason FromCustom(string value)
    {
        return new HookEndpointDisabledReason(value);
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

    public static bool operator ==(HookEndpointDisabledReason value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(HookEndpointDisabledReason value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(HookEndpointDisabledReason value) => value.Value;

    public static explicit operator HookEndpointDisabledReason(string value) => new(value);

    internal class HookEndpointDisabledReasonSerializer : JsonConverter<HookEndpointDisabledReason>
    {
        public override HookEndpointDisabledReason Read(
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
            return new HookEndpointDisabledReason(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            HookEndpointDisabledReason value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override HookEndpointDisabledReason ReadAsPropertyName(
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
            return new HookEndpointDisabledReason(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            HookEndpointDisabledReason value,
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
