using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(InboxThreadSummaryObject.InboxThreadSummaryObjectSerializer))]
[Serializable]
public readonly record struct InboxThreadSummaryObject : IStringEnum
{
    public static readonly InboxThreadSummaryObject InboxThread = new(Values.InboxThread);

    public InboxThreadSummaryObject(string value)
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
    public static InboxThreadSummaryObject FromCustom(string value)
    {
        return new InboxThreadSummaryObject(value);
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

    public static bool operator ==(InboxThreadSummaryObject value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(InboxThreadSummaryObject value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(InboxThreadSummaryObject value) => value.Value;

    public static explicit operator InboxThreadSummaryObject(string value) => new(value);

    internal class InboxThreadSummaryObjectSerializer : JsonConverter<InboxThreadSummaryObject>
    {
        public override InboxThreadSummaryObject Read(
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
            return new InboxThreadSummaryObject(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            InboxThreadSummaryObject value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override InboxThreadSummaryObject ReadAsPropertyName(
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
            return new InboxThreadSummaryObject(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            InboxThreadSummaryObject value,
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
        public const string InboxThread = "inbox_thread";
    }
}
