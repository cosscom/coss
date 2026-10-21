using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(HookEventTypeObject.HookEventTypeObjectSerializer))]
[Serializable]
public readonly record struct HookEventTypeObject : IStringEnum
{
    public static readonly HookEventTypeObject HookEventType = new(Values.HookEventType);

    public HookEventTypeObject(string value)
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
    public static HookEventTypeObject FromCustom(string value)
    {
        return new HookEventTypeObject(value);
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

    public static bool operator ==(HookEventTypeObject value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(HookEventTypeObject value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(HookEventTypeObject value) => value.Value;

    public static explicit operator HookEventTypeObject(string value) => new(value);

    internal class HookEventTypeObjectSerializer : JsonConverter<HookEventTypeObject>
    {
        public override HookEventTypeObject Read(
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
            return new HookEventTypeObject(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            HookEventTypeObject value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override HookEventTypeObject ReadAsPropertyName(
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
            return new HookEventTypeObject(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            HookEventTypeObject value,
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
        public const string HookEventType = "hook_event_type";
    }
}
