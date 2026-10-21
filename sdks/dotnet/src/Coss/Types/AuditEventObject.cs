using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(AuditEventObject.AuditEventObjectSerializer))]
[Serializable]
public readonly record struct AuditEventObject : IStringEnum
{
    public static readonly AuditEventObject AuditEvent = new(Values.AuditEvent);

    public AuditEventObject(string value)
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
    public static AuditEventObject FromCustom(string value)
    {
        return new AuditEventObject(value);
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

    public static bool operator ==(AuditEventObject value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(AuditEventObject value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(AuditEventObject value) => value.Value;

    public static explicit operator AuditEventObject(string value) => new(value);

    internal class AuditEventObjectSerializer : JsonConverter<AuditEventObject>
    {
        public override AuditEventObject Read(
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
            return new AuditEventObject(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            AuditEventObject value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override AuditEventObject ReadAsPropertyName(
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
            return new AuditEventObject(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            AuditEventObject value,
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
        public const string AuditEvent = "audit_event";
    }
}
