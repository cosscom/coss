using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(DeletedSignTemplateObject.DeletedSignTemplateObjectSerializer))]
[Serializable]
public readonly record struct DeletedSignTemplateObject : IStringEnum
{
    public static readonly DeletedSignTemplateObject SignTemplate = new(Values.SignTemplate);

    public DeletedSignTemplateObject(string value)
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
    public static DeletedSignTemplateObject FromCustom(string value)
    {
        return new DeletedSignTemplateObject(value);
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

    public static bool operator ==(DeletedSignTemplateObject value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(DeletedSignTemplateObject value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(DeletedSignTemplateObject value) => value.Value;

    public static explicit operator DeletedSignTemplateObject(string value) => new(value);

    internal class DeletedSignTemplateObjectSerializer : JsonConverter<DeletedSignTemplateObject>
    {
        public override DeletedSignTemplateObject Read(
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
            return new DeletedSignTemplateObject(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            DeletedSignTemplateObject value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override DeletedSignTemplateObject ReadAsPropertyName(
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
            return new DeletedSignTemplateObject(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            DeletedSignTemplateObject value,
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
        public const string SignTemplate = "sign_template";
    }
}
