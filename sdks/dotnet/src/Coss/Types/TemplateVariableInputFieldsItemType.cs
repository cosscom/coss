using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(
    typeof(TemplateVariableInputFieldsItemType.TemplateVariableInputFieldsItemTypeSerializer)
)]
[Serializable]
public readonly record struct TemplateVariableInputFieldsItemType : IStringEnum
{
    public static readonly TemplateVariableInputFieldsItemType String = new(Values.String);

    public static readonly TemplateVariableInputFieldsItemType Number = new(Values.Number);

    public static readonly TemplateVariableInputFieldsItemType Boolean = new(Values.Boolean);

    public TemplateVariableInputFieldsItemType(string value)
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
    public static TemplateVariableInputFieldsItemType FromCustom(string value)
    {
        return new TemplateVariableInputFieldsItemType(value);
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

    public static bool operator ==(TemplateVariableInputFieldsItemType value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(TemplateVariableInputFieldsItemType value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(TemplateVariableInputFieldsItemType value) =>
        value.Value;

    public static explicit operator TemplateVariableInputFieldsItemType(string value) => new(value);

    internal class TemplateVariableInputFieldsItemTypeSerializer
        : JsonConverter<TemplateVariableInputFieldsItemType>
    {
        public override TemplateVariableInputFieldsItemType Read(
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
            return new TemplateVariableInputFieldsItemType(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            TemplateVariableInputFieldsItemType value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override TemplateVariableInputFieldsItemType ReadAsPropertyName(
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
            return new TemplateVariableInputFieldsItemType(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            TemplateVariableInputFieldsItemType value,
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
    }
}
