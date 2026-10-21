using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(ReceivedEmailVerdictsSpam.ReceivedEmailVerdictsSpamSerializer))]
[Serializable]
public readonly record struct ReceivedEmailVerdictsSpam : IStringEnum
{
    public static readonly ReceivedEmailVerdictsSpam Pass = new(Values.Pass);

    public static readonly ReceivedEmailVerdictsSpam Fail = new(Values.Fail);

    public static readonly ReceivedEmailVerdictsSpam Gray = new(Values.Gray);

    public static readonly ReceivedEmailVerdictsSpam ProcessingFailed = new(
        Values.ProcessingFailed
    );

    public ReceivedEmailVerdictsSpam(string value)
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
    public static ReceivedEmailVerdictsSpam FromCustom(string value)
    {
        return new ReceivedEmailVerdictsSpam(value);
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

    public static bool operator ==(ReceivedEmailVerdictsSpam value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(ReceivedEmailVerdictsSpam value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(ReceivedEmailVerdictsSpam value) => value.Value;

    public static explicit operator ReceivedEmailVerdictsSpam(string value) => new(value);

    internal class ReceivedEmailVerdictsSpamSerializer : JsonConverter<ReceivedEmailVerdictsSpam>
    {
        public override ReceivedEmailVerdictsSpam Read(
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
            return new ReceivedEmailVerdictsSpam(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            ReceivedEmailVerdictsSpam value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override ReceivedEmailVerdictsSpam ReadAsPropertyName(
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
            return new ReceivedEmailVerdictsSpam(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            ReceivedEmailVerdictsSpam value,
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
        public const string Pass = "pass";

        public const string Fail = "fail";

        public const string Gray = "gray";

        public const string ProcessingFailed = "processing_failed";
    }
}
