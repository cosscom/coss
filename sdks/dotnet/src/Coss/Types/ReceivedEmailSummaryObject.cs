using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(ReceivedEmailSummaryObject.ReceivedEmailSummaryObjectSerializer))]
[Serializable]
public readonly record struct ReceivedEmailSummaryObject : IStringEnum
{
    public static readonly ReceivedEmailSummaryObject ReceivedEmail = new(Values.ReceivedEmail);

    public ReceivedEmailSummaryObject(string value)
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
    public static ReceivedEmailSummaryObject FromCustom(string value)
    {
        return new ReceivedEmailSummaryObject(value);
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

    public static bool operator ==(ReceivedEmailSummaryObject value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(ReceivedEmailSummaryObject value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(ReceivedEmailSummaryObject value) => value.Value;

    public static explicit operator ReceivedEmailSummaryObject(string value) => new(value);

    internal class ReceivedEmailSummaryObjectSerializer : JsonConverter<ReceivedEmailSummaryObject>
    {
        public override ReceivedEmailSummaryObject Read(
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
            return new ReceivedEmailSummaryObject(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            ReceivedEmailSummaryObject value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override ReceivedEmailSummaryObject ReadAsPropertyName(
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
            return new ReceivedEmailSummaryObject(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            ReceivedEmailSummaryObject value,
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
        public const string ReceivedEmail = "received_email";
    }
}
