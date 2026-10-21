using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(ReceivedEmailVerdictsVirus.ReceivedEmailVerdictsVirusSerializer))]
[Serializable]
public readonly record struct ReceivedEmailVerdictsVirus : IStringEnum
{
    public static readonly ReceivedEmailVerdictsVirus Pass = new(Values.Pass);

    public static readonly ReceivedEmailVerdictsVirus Fail = new(Values.Fail);

    public static readonly ReceivedEmailVerdictsVirus Gray = new(Values.Gray);

    public static readonly ReceivedEmailVerdictsVirus ProcessingFailed = new(
        Values.ProcessingFailed
    );

    public ReceivedEmailVerdictsVirus(string value)
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
    public static ReceivedEmailVerdictsVirus FromCustom(string value)
    {
        return new ReceivedEmailVerdictsVirus(value);
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

    public static bool operator ==(ReceivedEmailVerdictsVirus value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(ReceivedEmailVerdictsVirus value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(ReceivedEmailVerdictsVirus value) => value.Value;

    public static explicit operator ReceivedEmailVerdictsVirus(string value) => new(value);

    internal class ReceivedEmailVerdictsVirusSerializer : JsonConverter<ReceivedEmailVerdictsVirus>
    {
        public override ReceivedEmailVerdictsVirus Read(
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
            return new ReceivedEmailVerdictsVirus(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            ReceivedEmailVerdictsVirus value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override ReceivedEmailVerdictsVirus ReadAsPropertyName(
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
            return new ReceivedEmailVerdictsVirus(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            ReceivedEmailVerdictsVirus value,
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
