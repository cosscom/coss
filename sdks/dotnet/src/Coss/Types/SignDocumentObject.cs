using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(SignDocumentObject.SignDocumentObjectSerializer))]
[Serializable]
public readonly record struct SignDocumentObject : IStringEnum
{
    public static readonly SignDocumentObject SignDocument = new(Values.SignDocument);

    public SignDocumentObject(string value)
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
    public static SignDocumentObject FromCustom(string value)
    {
        return new SignDocumentObject(value);
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

    public static bool operator ==(SignDocumentObject value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(SignDocumentObject value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(SignDocumentObject value) => value.Value;

    public static explicit operator SignDocumentObject(string value) => new(value);

    internal class SignDocumentObjectSerializer : JsonConverter<SignDocumentObject>
    {
        public override SignDocumentObject Read(
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
            return new SignDocumentObject(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            SignDocumentObject value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override SignDocumentObject ReadAsPropertyName(
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
            return new SignDocumentObject(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            SignDocumentObject value,
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
