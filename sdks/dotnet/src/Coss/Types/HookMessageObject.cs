using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(HookMessageObject.HookMessageObjectSerializer))]
[Serializable]
public readonly record struct HookMessageObject : IStringEnum
{
    public static readonly HookMessageObject HookMessage = new(Values.HookMessage);

    public HookMessageObject(string value)
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
    public static HookMessageObject FromCustom(string value)
    {
        return new HookMessageObject(value);
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

    public static bool operator ==(HookMessageObject value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(HookMessageObject value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(HookMessageObject value) => value.Value;

    public static explicit operator HookMessageObject(string value) => new(value);

    internal class HookMessageObjectSerializer : JsonConverter<HookMessageObject>
    {
        public override HookMessageObject Read(
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
            return new HookMessageObject(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            HookMessageObject value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override HookMessageObject ReadAsPropertyName(
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
            return new HookMessageObject(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            HookMessageObject value,
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
        public const string HookMessage = "hook_message";
    }
}
