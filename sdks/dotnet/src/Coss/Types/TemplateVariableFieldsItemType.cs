using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(TemplateVariableFieldsItemType.TemplateVariableFieldsItemTypeSerializer))]
[Serializable]
public readonly record struct TemplateVariableFieldsItemType : IStringEnum
{
    public static readonly TemplateVariableFieldsItemType String = new(Values.String);

    public static readonly TemplateVariableFieldsItemType Number = new(Values.Number);

    public static readonly TemplateVariableFieldsItemType Boolean = new(Values.Boolean);

    public TemplateVariableFieldsItemType(string value)
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
    public static TemplateVariableFieldsItemType FromCustom(string value)
    {
        return new TemplateVariableFieldsItemType(value);
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

    public static bool operator ==(TemplateVariableFieldsItemType value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(TemplateVariableFieldsItemType value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(TemplateVariableFieldsItemType value) => value.Value;

    public static explicit operator TemplateVariableFieldsItemType(string value) => new(value);

    internal class TemplateVariableFieldsItemTypeSerializer
        : JsonConverter<TemplateVariableFieldsItemType>
    {
        public override TemplateVariableFieldsItemType Read(
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
            return new TemplateVariableFieldsItemType(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            TemplateVariableFieldsItemType value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override TemplateVariableFieldsItemType ReadAsPropertyName(
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
            return new TemplateVariableFieldsItemType(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            TemplateVariableFieldsItemType value,
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
