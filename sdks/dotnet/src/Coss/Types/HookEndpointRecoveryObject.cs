using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(HookEndpointRecoveryObject.HookEndpointRecoveryObjectSerializer))]
[Serializable]
public readonly record struct HookEndpointRecoveryObject : IStringEnum
{
    public static readonly HookEndpointRecoveryObject HookEndpointRecovery = new(
        Values.HookEndpointRecovery
    );

    public HookEndpointRecoveryObject(string value)
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
    public static HookEndpointRecoveryObject FromCustom(string value)
    {
        return new HookEndpointRecoveryObject(value);
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

    public static bool operator ==(HookEndpointRecoveryObject value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(HookEndpointRecoveryObject value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(HookEndpointRecoveryObject value) => value.Value;

    public static explicit operator HookEndpointRecoveryObject(string value) => new(value);

    internal class HookEndpointRecoveryObjectSerializer : JsonConverter<HookEndpointRecoveryObject>
    {
        public override HookEndpointRecoveryObject Read(
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
            return new HookEndpointRecoveryObject(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            HookEndpointRecoveryObject value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override HookEndpointRecoveryObject ReadAsPropertyName(
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
            return new HookEndpointRecoveryObject(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            HookEndpointRecoveryObject value,
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
        public const string HookEndpointRecovery = "hook_endpoint_recovery";
    }
}
