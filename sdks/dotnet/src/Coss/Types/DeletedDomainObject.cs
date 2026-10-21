using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(DeletedDomainObject.DeletedDomainObjectSerializer))]
[Serializable]
public readonly record struct DeletedDomainObject : IStringEnum
{
    public static readonly DeletedDomainObject Domain = new(Values.Domain);

    public DeletedDomainObject(string value)
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
    public static DeletedDomainObject FromCustom(string value)
    {
        return new DeletedDomainObject(value);
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

    public static bool operator ==(DeletedDomainObject value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(DeletedDomainObject value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(DeletedDomainObject value) => value.Value;

    public static explicit operator DeletedDomainObject(string value) => new(value);

    internal class DeletedDomainObjectSerializer : JsonConverter<DeletedDomainObject>
    {
        public override DeletedDomainObject Read(
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
            return new DeletedDomainObject(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            DeletedDomainObject value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override DeletedDomainObject ReadAsPropertyName(
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
            return new DeletedDomainObject(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            DeletedDomainObject value,
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
