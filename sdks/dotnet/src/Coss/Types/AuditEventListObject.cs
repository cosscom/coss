using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(AuditEventListObject.AuditEventListObjectSerializer))]
[Serializable]
public readonly record struct AuditEventListObject : IStringEnum
{
    public static readonly AuditEventListObject List = new(Values.List);

    public AuditEventListObject(string value)
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
    public static AuditEventListObject FromCustom(string value)
    {
        return new AuditEventListObject(value);
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

    public static bool operator ==(AuditEventListObject value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(AuditEventListObject value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(AuditEventListObject value) => value.Value;

    public static explicit operator AuditEventListObject(string value) => new(value);

    internal class AuditEventListObjectSerializer : JsonConverter<AuditEventListObject>
    {
        public override AuditEventListObject Read(
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
            return new AuditEventListObject(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            AuditEventListObject value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override AuditEventListObject ReadAsPropertyName(
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
            return new AuditEventListObject(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            AuditEventListObject value,
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
        public const string List = "list";
    }
}
