using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(ReceivedEmailVerdictsDkim.ReceivedEmailVerdictsDkimSerializer))]
[Serializable]
public readonly record struct ReceivedEmailVerdictsDkim : IStringEnum
{
    public static readonly ReceivedEmailVerdictsDkim Pass = new(Values.Pass);

    public static readonly ReceivedEmailVerdictsDkim Fail = new(Values.Fail);

    public static readonly ReceivedEmailVerdictsDkim Gray = new(Values.Gray);

    public static readonly ReceivedEmailVerdictsDkim ProcessingFailed = new(
        Values.ProcessingFailed
    );

    public ReceivedEmailVerdictsDkim(string value)
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
    public static ReceivedEmailVerdictsDkim FromCustom(string value)
    {
        return new ReceivedEmailVerdictsDkim(value);
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

    public static bool operator ==(ReceivedEmailVerdictsDkim value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(ReceivedEmailVerdictsDkim value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(ReceivedEmailVerdictsDkim value) => value.Value;

    public static explicit operator ReceivedEmailVerdictsDkim(string value) => new(value);

    internal class ReceivedEmailVerdictsDkimSerializer : JsonConverter<ReceivedEmailVerdictsDkim>
    {
        public override ReceivedEmailVerdictsDkim Read(
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
            return new ReceivedEmailVerdictsDkim(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            ReceivedEmailVerdictsDkim value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override ReceivedEmailVerdictsDkim ReadAsPropertyName(
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
            return new ReceivedEmailVerdictsDkim(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            ReceivedEmailVerdictsDkim value,
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
