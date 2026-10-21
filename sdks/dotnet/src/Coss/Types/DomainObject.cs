using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(DomainObject.DomainObjectSerializer))]
[Serializable]
public readonly record struct DomainObject : IStringEnum
{
    public static readonly DomainObject Domain = new(Values.Domain);

    public DomainObject(string value)
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
    public static DomainObject FromCustom(string value)
    {
        return new DomainObject(value);
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

    public static bool operator ==(DomainObject value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(DomainObject value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(DomainObject value) => value.Value;

    public static explicit operator DomainObject(string value) => new(value);

    internal class DomainObjectSerializer : JsonConverter<DomainObject>
    {
        public override DomainObject Read(
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
            return new DomainObject(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            DomainObject value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override DomainObject ReadAsPropertyName(
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
            return new DomainObject(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            DomainObject value,
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
        public const string Domain = "domain";
    }
}
