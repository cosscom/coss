using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(HookApplicationObject.HookApplicationObjectSerializer))]
[Serializable]
public readonly record struct HookApplicationObject : IStringEnum
{
    public static readonly HookApplicationObject HookApplication = new(Values.HookApplication);

    public HookApplicationObject(string value)
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
    public static HookApplicationObject FromCustom(string value)
    {
        return new HookApplicationObject(value);
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

    public static bool operator ==(HookApplicationObject value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(HookApplicationObject value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(HookApplicationObject value) => value.Value;

    public static explicit operator HookApplicationObject(string value) => new(value);

    internal class HookApplicationObjectSerializer : JsonConverter<HookApplicationObject>
    {
        public override HookApplicationObject Read(
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
            return new HookApplicationObject(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            HookApplicationObject value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override HookApplicationObject ReadAsPropertyName(
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
            return new HookApplicationObject(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            HookApplicationObject value,
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
        public const string HookApplication = "hook_application";
    }
}
