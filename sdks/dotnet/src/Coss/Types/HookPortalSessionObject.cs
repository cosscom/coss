using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(HookPortalSessionObject.HookPortalSessionObjectSerializer))]
[Serializable]
public readonly record struct HookPortalSessionObject : IStringEnum
{
    public static readonly HookPortalSessionObject HookPortalSession = new(
        Values.HookPortalSession
    );

    public HookPortalSessionObject(string value)
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
    public static HookPortalSessionObject FromCustom(string value)
    {
        return new HookPortalSessionObject(value);
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

    public static bool operator ==(HookPortalSessionObject value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(HookPortalSessionObject value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(HookPortalSessionObject value) => value.Value;

    public static explicit operator HookPortalSessionObject(string value) => new(value);

    internal class HookPortalSessionObjectSerializer : JsonConverter<HookPortalSessionObject>
    {
        public override HookPortalSessionObject Read(
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
            return new HookPortalSessionObject(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            HookPortalSessionObject value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override HookPortalSessionObject ReadAsPropertyName(
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
            return new HookPortalSessionObject(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            HookPortalSessionObject value,
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
        public const string HookPortalSession = "hook_portal_session";
    }
}
