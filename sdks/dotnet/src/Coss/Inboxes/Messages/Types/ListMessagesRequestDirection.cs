using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss.Inboxes;

[JsonConverter(typeof(ListMessagesRequestDirection.ListMessagesRequestDirectionSerializer))]
[Serializable]
public readonly record struct ListMessagesRequestDirection : IStringEnum
{
    public static readonly ListMessagesRequestDirection Inbound = new(Values.Inbound);

    public static readonly ListMessagesRequestDirection Outbound = new(Values.Outbound);

    public ListMessagesRequestDirection(string value)
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
    public static ListMessagesRequestDirection FromCustom(string value)
    {
        return new ListMessagesRequestDirection(value);
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

    public static bool operator ==(ListMessagesRequestDirection value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(ListMessagesRequestDirection value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(ListMessagesRequestDirection value) => value.Value;

    public static explicit operator ListMessagesRequestDirection(string value) => new(value);

    internal class ListMessagesRequestDirectionSerializer
        : JsonConverter<ListMessagesRequestDirection>
    {
        public override ListMessagesRequestDirection Read(
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
            return new ListMessagesRequestDirection(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            ListMessagesRequestDirection value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override ListMessagesRequestDirection ReadAsPropertyName(
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
            return new ListMessagesRequestDirection(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            ListMessagesRequestDirection value,
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
