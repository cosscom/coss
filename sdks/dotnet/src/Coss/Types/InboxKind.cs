using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(InboxKind.InboxKindSerializer))]
[Serializable]
public readonly record struct InboxKind : IStringEnum
{
    public static readonly InboxKind Managed = new(Values.Managed);

    public static readonly InboxKind Domain = new(Values.Domain);

    public InboxKind(string value)
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
    public static InboxKind FromCustom(string value)
    {
        return new InboxKind(value);
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

    public static bool operator ==(InboxKind value1, string value2) => value1.Value.Equals(value2);

    public static bool operator !=(InboxKind value1, string value2) => !value1.Value.Equals(value2);

    public static explicit operator string(InboxKind value) => value.Value;

    public static explicit operator InboxKind(string value) => new(value);

    internal class InboxKindSerializer : JsonConverter<InboxKind>
    {
        public override InboxKind Read(
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
            return new InboxKind(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            InboxKind value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override InboxKind ReadAsPropertyName(
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
            return new InboxKind(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            InboxKind value,
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
        public const string Managed = "managed";

        public const string Domain = "domain";
    }
}
