using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(InboxMessageDirection.InboxMessageDirectionSerializer))]
[Serializable]
public readonly record struct InboxMessageDirection : IStringEnum
{
    public static readonly InboxMessageDirection Inbound = new(Values.Inbound);

    public static readonly InboxMessageDirection Outbound = new(Values.Outbound);

    public InboxMessageDirection(string value)
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
    public static InboxMessageDirection FromCustom(string value)
    {
        return new InboxMessageDirection(value);
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

    public static bool operator ==(InboxMessageDirection value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(InboxMessageDirection value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(InboxMessageDirection value) => value.Value;

    public static explicit operator InboxMessageDirection(string value) => new(value);

    internal class InboxMessageDirectionSerializer : JsonConverter<InboxMessageDirection>
    {
        public override InboxMessageDirection Read(
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
            return new InboxMessageDirection(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            InboxMessageDirection value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override InboxMessageDirection ReadAsPropertyName(
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
            return new InboxMessageDirection(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            InboxMessageDirection value,
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
