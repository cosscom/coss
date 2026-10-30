using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(FormObject.FormObjectSerializer))]
[Serializable]
public readonly record struct FormObject : IStringEnum
{
    public static readonly FormObject Form = new(Values.Form);

    public FormObject(string value)
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
    public static FormObject FromCustom(string value)
    {
        return new FormObject(value);
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

    public static bool operator ==(FormObject value1, string value2) => value1.Value.Equals(value2);

    public static bool operator !=(FormObject value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(FormObject value) => value.Value;

    public static explicit operator FormObject(string value) => new(value);

    internal class FormObjectSerializer : JsonConverter<FormObject>
    {
        public override FormObject Read(
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
            return new FormObject(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            FormObject value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override FormObject ReadAsPropertyName(
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
            return new FormObject(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            FormObject value,
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
