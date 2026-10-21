using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(TemplateProblemField.TemplateProblemFieldSerializer))]
[Serializable]
public readonly record struct TemplateProblemField : IStringEnum
{
    public static readonly TemplateProblemField Subject = new(Values.Subject);

    public static readonly TemplateProblemField Html = new(Values.Html);

    public static readonly TemplateProblemField Text = new(Values.Text);

    public TemplateProblemField(string value)
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
    public static TemplateProblemField FromCustom(string value)
    {
        return new TemplateProblemField(value);
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

    public static bool operator ==(TemplateProblemField value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(TemplateProblemField value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(TemplateProblemField value) => value.Value;

    public static explicit operator TemplateProblemField(string value) => new(value);

    internal class TemplateProblemFieldSerializer : JsonConverter<TemplateProblemField>
    {
        public override TemplateProblemField Read(
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
            return new TemplateProblemField(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            TemplateProblemField value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override TemplateProblemField ReadAsPropertyName(
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
            return new TemplateProblemField(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            TemplateProblemField value,
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
        public const string Subject = "subject";

        public const string Html = "html";

        public const string Text = "text";
    }
}
