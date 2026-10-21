using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(ReceivedEmailVerdictsDmarc.ReceivedEmailVerdictsDmarcSerializer))]
[Serializable]
public readonly record struct ReceivedEmailVerdictsDmarc : IStringEnum
{
    public static readonly ReceivedEmailVerdictsDmarc Pass = new(Values.Pass);

    public static readonly ReceivedEmailVerdictsDmarc Fail = new(Values.Fail);

    public static readonly ReceivedEmailVerdictsDmarc Gray = new(Values.Gray);

    public static readonly ReceivedEmailVerdictsDmarc ProcessingFailed = new(
        Values.ProcessingFailed
    );

    public ReceivedEmailVerdictsDmarc(string value)
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
    public static ReceivedEmailVerdictsDmarc FromCustom(string value)
    {
        return new ReceivedEmailVerdictsDmarc(value);
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

    public static bool operator ==(ReceivedEmailVerdictsDmarc value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(ReceivedEmailVerdictsDmarc value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(ReceivedEmailVerdictsDmarc value) => value.Value;

    public static explicit operator ReceivedEmailVerdictsDmarc(string value) => new(value);

    internal class ReceivedEmailVerdictsDmarcSerializer : JsonConverter<ReceivedEmailVerdictsDmarc>
    {
        public override ReceivedEmailVerdictsDmarc Read(
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
            return new ReceivedEmailVerdictsDmarc(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            ReceivedEmailVerdictsDmarc value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override ReceivedEmailVerdictsDmarc ReadAsPropertyName(
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
            return new ReceivedEmailVerdictsDmarc(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            ReceivedEmailVerdictsDmarc value,
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
