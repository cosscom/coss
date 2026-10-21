using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(TopicDefaultSubscription.TopicDefaultSubscriptionSerializer))]
[Serializable]
public readonly record struct TopicDefaultSubscription : IStringEnum
{
    public static readonly TopicDefaultSubscription OptIn = new(Values.OptIn);

    public static readonly TopicDefaultSubscription OptOut = new(Values.OptOut);

    public TopicDefaultSubscription(string value)
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
    public static TopicDefaultSubscription FromCustom(string value)
    {
        return new TopicDefaultSubscription(value);
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

    public static bool operator ==(TopicDefaultSubscription value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(TopicDefaultSubscription value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(TopicDefaultSubscription value) => value.Value;

    public static explicit operator TopicDefaultSubscription(string value) => new(value);

    internal class TopicDefaultSubscriptionSerializer : JsonConverter<TopicDefaultSubscription>
    {
        public override TopicDefaultSubscription Read(
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
            return new TopicDefaultSubscription(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            TopicDefaultSubscription value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override TopicDefaultSubscription ReadAsPropertyName(
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
            return new TopicDefaultSubscription(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            TopicDefaultSubscription value,
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
        public const string OptIn = "opt_in";

        public const string OptOut = "opt_out";
    }
}
