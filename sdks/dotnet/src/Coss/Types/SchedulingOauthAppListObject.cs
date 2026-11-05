using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(SchedulingOauthAppListObject.SchedulingOauthAppListObjectSerializer))]
[Serializable]
public readonly record struct SchedulingOauthAppListObject : IStringEnum
{
    public static readonly SchedulingOauthAppListObject List = new(Values.List);

    public SchedulingOauthAppListObject(string value)
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
    public static SchedulingOauthAppListObject FromCustom(string value)
    {
        return new SchedulingOauthAppListObject(value);
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

    public static bool operator ==(SchedulingOauthAppListObject value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(SchedulingOauthAppListObject value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(SchedulingOauthAppListObject value) => value.Value;

    public static explicit operator SchedulingOauthAppListObject(string value) => new(value);

    internal class SchedulingOauthAppListObjectSerializer
        : JsonConverter<SchedulingOauthAppListObject>
    {
        public override SchedulingOauthAppListObject Read(
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
            return new SchedulingOauthAppListObject(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            SchedulingOauthAppListObject value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override SchedulingOauthAppListObject ReadAsPropertyName(
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
            return new SchedulingOauthAppListObject(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            SchedulingOauthAppListObject value,
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
