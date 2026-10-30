using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(DeletedSignDocumentObject.DeletedSignDocumentObjectSerializer))]
[Serializable]
public readonly record struct DeletedSignDocumentObject : IStringEnum
{
    public static readonly DeletedSignDocumentObject SignDocument = new(Values.SignDocument);

    public DeletedSignDocumentObject(string value)
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
    public static DeletedSignDocumentObject FromCustom(string value)
    {
        return new DeletedSignDocumentObject(value);
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

    public static bool operator ==(DeletedSignDocumentObject value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(DeletedSignDocumentObject value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(DeletedSignDocumentObject value) => value.Value;

    public static explicit operator DeletedSignDocumentObject(string value) => new(value);

    internal class DeletedSignDocumentObjectSerializer : JsonConverter<DeletedSignDocumentObject>
    {
        public override DeletedSignDocumentObject Read(
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
            return new DeletedSignDocumentObject(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            DeletedSignDocumentObject value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override DeletedSignDocumentObject ReadAsPropertyName(
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
            return new DeletedSignDocumentObject(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            DeletedSignDocumentObject value,
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
        public const string SignDocument = "sign_document";
    }
}
