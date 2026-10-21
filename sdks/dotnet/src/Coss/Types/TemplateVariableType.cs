using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(TemplateVariableType.TemplateVariableTypeSerializer))]
[Serializable]
public readonly record struct TemplateVariableType : IStringEnum
{
    public static readonly TemplateVariableType String = new(Values.String);

    public static readonly TemplateVariableType Number = new(Values.Number);

    public static readonly TemplateVariableType Boolean = new(Values.Boolean);

    public static readonly TemplateVariableType List = new(Values.List);

    public TemplateVariableType(string value)
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
    public static TemplateVariableType FromCustom(string value)
    {
        return new TemplateVariableType(value);
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

    public static bool operator ==(TemplateVariableType value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(TemplateVariableType value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(TemplateVariableType value) => value.Value;

    public static explicit operator TemplateVariableType(string value) => new(value);

    internal class TemplateVariableTypeSerializer : JsonConverter<TemplateVariableType>
    {
        public override TemplateVariableType Read(
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
            return new TemplateVariableType(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            TemplateVariableType value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override TemplateVariableType ReadAsPropertyName(
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
            return new TemplateVariableType(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            TemplateVariableType value,
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
        public const string String = "string";

        public const string Number = "number";

        public const string Boolean = "boolean";

        public const string List = "list";
    }
}
