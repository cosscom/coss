using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(TopicVisibility.TopicVisibilitySerializer))]
[Serializable]
public readonly record struct TopicVisibility : IStringEnum
{
    public static readonly TopicVisibility Public = new(Values.Public);

    public static readonly TopicVisibility Private = new(Values.Private);

    public TopicVisibility(string value)
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
    public static TopicVisibility FromCustom(string value)
    {
        return new TopicVisibility(value);
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

    public static bool operator ==(TopicVisibility value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(TopicVisibility value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(TopicVisibility value) => value.Value;

    public static explicit operator TopicVisibility(string value) => new(value);

    internal class TopicVisibilitySerializer : JsonConverter<TopicVisibility>
    {
        public override TopicVisibility Read(
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
            return new TopicVisibility(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            TopicVisibility value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override TopicVisibility ReadAsPropertyName(
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
            return new TopicVisibility(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            TopicVisibility value,
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
        public const string Public = "public";

        public const string Private = "private";
    }
}
