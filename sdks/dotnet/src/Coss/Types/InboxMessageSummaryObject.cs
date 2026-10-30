using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(InboxMessageSummaryObject.InboxMessageSummaryObjectSerializer))]
[Serializable]
public readonly record struct InboxMessageSummaryObject : IStringEnum
{
    public static readonly InboxMessageSummaryObject InboxMessage = new(Values.InboxMessage);

    public InboxMessageSummaryObject(string value)
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
    public static InboxMessageSummaryObject FromCustom(string value)
    {
        return new InboxMessageSummaryObject(value);
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

    public static bool operator ==(InboxMessageSummaryObject value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(InboxMessageSummaryObject value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(InboxMessageSummaryObject value) => value.Value;

    public static explicit operator InboxMessageSummaryObject(string value) => new(value);

    internal class InboxMessageSummaryObjectSerializer : JsonConverter<InboxMessageSummaryObject>
    {
        public override InboxMessageSummaryObject Read(
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
            return new InboxMessageSummaryObject(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            InboxMessageSummaryObject value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override InboxMessageSummaryObject ReadAsPropertyName(
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
            return new InboxMessageSummaryObject(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            InboxMessageSummaryObject value,
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
        public const string InboxMessage = "inbox_message";
    }
}
