using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(HookAttemptObject.HookAttemptObjectSerializer))]
[Serializable]
public readonly record struct HookAttemptObject : IStringEnum
{
    public static readonly HookAttemptObject HookAttempt = new(Values.HookAttempt);

    public HookAttemptObject(string value)
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
    public static HookAttemptObject FromCustom(string value)
    {
        return new HookAttemptObject(value);
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

    public static bool operator ==(HookAttemptObject value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(HookAttemptObject value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(HookAttemptObject value) => value.Value;

    public static explicit operator HookAttemptObject(string value) => new(value);

    internal class HookAttemptObjectSerializer : JsonConverter<HookAttemptObject>
    {
        public override HookAttemptObject Read(
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
            return new HookAttemptObject(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            HookAttemptObject value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override HookAttemptObject ReadAsPropertyName(
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
            return new HookAttemptObject(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            HookAttemptObject value,
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
        public const string HookAttempt = "hook_attempt";
    }
}
