using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(TemplateVariableInputType.TemplateVariableInputTypeSerializer))]
[Serializable]
public readonly record struct TemplateVariableInputType : IStringEnum
{
    public static readonly TemplateVariableInputType String = new(Values.String);

    public static readonly TemplateVariableInputType Number = new(Values.Number);

    public static readonly TemplateVariableInputType Boolean = new(Values.Boolean);

    public static readonly TemplateVariableInputType List = new(Values.List);

    public TemplateVariableInputType(string value)
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
    public static TemplateVariableInputType FromCustom(string value)
    {
        return new TemplateVariableInputType(value);
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

    public static bool operator ==(TemplateVariableInputType value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(TemplateVariableInputType value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(TemplateVariableInputType value) => value.Value;

    public static explicit operator TemplateVariableInputType(string value) => new(value);

    internal class TemplateVariableInputTypeSerializer : JsonConverter<TemplateVariableInputType>
    {
        public override TemplateVariableInputType Read(
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
            return new TemplateVariableInputType(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            TemplateVariableInputType value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override TemplateVariableInputType ReadAsPropertyName(
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
            return new TemplateVariableInputType(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            TemplateVariableInputType value,
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
