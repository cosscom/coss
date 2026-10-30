using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(InboxMessageSummaryDirection.InboxMessageSummaryDirectionSerializer))]
[Serializable]
public readonly record struct InboxMessageSummaryDirection : IStringEnum
{
    public static readonly InboxMessageSummaryDirection Inbound = new(Values.Inbound);

    public static readonly InboxMessageSummaryDirection Outbound = new(Values.Outbound);

    public InboxMessageSummaryDirection(string value)
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
    public static InboxMessageSummaryDirection FromCustom(string value)
    {
        return new InboxMessageSummaryDirection(value);
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

    public static bool operator ==(InboxMessageSummaryDirection value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(InboxMessageSummaryDirection value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(InboxMessageSummaryDirection value) => value.Value;

    public static explicit operator InboxMessageSummaryDirection(string value) => new(value);

    internal class InboxMessageSummaryDirectionSerializer
        : JsonConverter<InboxMessageSummaryDirection>
    {
        public override InboxMessageSummaryDirection Read(
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
            return new InboxMessageSummaryDirection(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            InboxMessageSummaryDirection value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override InboxMessageSummaryDirection ReadAsPropertyName(
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
            return new InboxMessageSummaryDirection(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            InboxMessageSummaryDirection value,
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
        public const string Inbound = "inbound";

        public const string Outbound = "outbound";
    }
}
