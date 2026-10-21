using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(HookEndpointSecretObject.HookEndpointSecretObjectSerializer))]
[Serializable]
public readonly record struct HookEndpointSecretObject : IStringEnum
{
    public static readonly HookEndpointSecretObject HookEndpointSecret = new(
        Values.HookEndpointSecret
    );

    public HookEndpointSecretObject(string value)
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
    public static HookEndpointSecretObject FromCustom(string value)
    {
        return new HookEndpointSecretObject(value);
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

    public static bool operator ==(HookEndpointSecretObject value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(HookEndpointSecretObject value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(HookEndpointSecretObject value) => value.Value;

    public static explicit operator HookEndpointSecretObject(string value) => new(value);

    internal class HookEndpointSecretObjectSerializer : JsonConverter<HookEndpointSecretObject>
    {
        public override HookEndpointSecretObject Read(
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
            return new HookEndpointSecretObject(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            HookEndpointSecretObject value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override HookEndpointSecretObject ReadAsPropertyName(
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
            return new HookEndpointSecretObject(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            HookEndpointSecretObject value,
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
        public const string HookEndpointSecret = "hook_endpoint_secret";
    }
}
