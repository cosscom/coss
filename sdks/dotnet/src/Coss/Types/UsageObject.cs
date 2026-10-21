using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(UsageObject.UsageObjectSerializer))]
[Serializable]
public readonly record struct UsageObject : IStringEnum
{
    public static readonly UsageObject Usage = new(Values.Usage);

    public UsageObject(string value)
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
    public static UsageObject FromCustom(string value)
    {
        return new UsageObject(value);
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

    public static bool operator ==(UsageObject value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(UsageObject value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(UsageObject value) => value.Value;

    public static explicit operator UsageObject(string value) => new(value);

    internal class UsageObjectSerializer : JsonConverter<UsageObject>
    {
        public override UsageObject Read(
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
            return new UsageObject(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            UsageObject value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override UsageObject ReadAsPropertyName(
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
            return new UsageObject(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            UsageObject value,
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
        public const string Usage = "usage";
    }
}
