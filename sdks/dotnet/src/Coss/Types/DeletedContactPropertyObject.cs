using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(DeletedContactPropertyObject.DeletedContactPropertyObjectSerializer))]
[Serializable]
public readonly record struct DeletedContactPropertyObject : IStringEnum
{
    public static readonly DeletedContactPropertyObject ContactProperty = new(
        Values.ContactProperty
    );

    public DeletedContactPropertyObject(string value)
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
    public static DeletedContactPropertyObject FromCustom(string value)
    {
        return new DeletedContactPropertyObject(value);
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

    public static bool operator ==(DeletedContactPropertyObject value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(DeletedContactPropertyObject value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(DeletedContactPropertyObject value) => value.Value;

    public static explicit operator DeletedContactPropertyObject(string value) => new(value);

    internal class DeletedContactPropertyObjectSerializer
        : JsonConverter<DeletedContactPropertyObject>
    {
        public override DeletedContactPropertyObject Read(
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
            return new DeletedContactPropertyObject(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            DeletedContactPropertyObject value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override DeletedContactPropertyObject ReadAsPropertyName(
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
            return new DeletedContactPropertyObject(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            DeletedContactPropertyObject value,
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
        public const string ContactProperty = "contact_property";
    }
}
