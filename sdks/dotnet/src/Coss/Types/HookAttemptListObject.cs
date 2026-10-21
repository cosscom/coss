using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(HookAttemptListObject.HookAttemptListObjectSerializer))]
[Serializable]
public readonly record struct HookAttemptListObject : IStringEnum
{
    public static readonly HookAttemptListObject List = new(Values.List);

    public HookAttemptListObject(string value)
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
    public static HookAttemptListObject FromCustom(string value)
    {
        return new HookAttemptListObject(value);
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

    public static bool operator ==(HookAttemptListObject value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(HookAttemptListObject value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(HookAttemptListObject value) => value.Value;

    public static explicit operator HookAttemptListObject(string value) => new(value);

    internal class HookAttemptListObjectSerializer : JsonConverter<HookAttemptListObject>
    {
        public override HookAttemptListObject Read(
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
            return new HookAttemptListObject(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            HookAttemptListObject value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override HookAttemptListObject ReadAsPropertyName(
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
            return new HookAttemptListObject(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            HookAttemptListObject value,
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
        public const string List = "list";
    }
}
