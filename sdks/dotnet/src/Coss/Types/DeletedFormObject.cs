using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(DeletedFormObject.DeletedFormObjectSerializer))]
[Serializable]
public readonly record struct DeletedFormObject : IStringEnum
{
    public static readonly DeletedFormObject Form = new(Values.Form);

    public DeletedFormObject(string value)
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
    public static DeletedFormObject FromCustom(string value)
    {
        return new DeletedFormObject(value);
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

    public static bool operator ==(DeletedFormObject value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(DeletedFormObject value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(DeletedFormObject value) => value.Value;

    public static explicit operator DeletedFormObject(string value) => new(value);

    internal class DeletedFormObjectSerializer : JsonConverter<DeletedFormObject>
    {
        public override DeletedFormObject Read(
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
            return new DeletedFormObject(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            DeletedFormObject value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override DeletedFormObject ReadAsPropertyName(
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
            return new DeletedFormObject(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            DeletedFormObject value,
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
        public const string Form = "form";
    }
}
