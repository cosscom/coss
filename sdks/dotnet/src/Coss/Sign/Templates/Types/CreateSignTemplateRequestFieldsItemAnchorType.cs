using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss.Sign;

[JsonConverter(
    typeof(CreateSignTemplateRequestFieldsItemAnchorType.CreateSignTemplateRequestFieldsItemAnchorTypeSerializer)
)]
[Serializable]
public readonly record struct CreateSignTemplateRequestFieldsItemAnchorType : IStringEnum
{
    public static readonly CreateSignTemplateRequestFieldsItemAnchorType Signature = new(
        Values.Signature
    );

    public static readonly CreateSignTemplateRequestFieldsItemAnchorType Initials = new(
        Values.Initials
    );

    public static readonly CreateSignTemplateRequestFieldsItemAnchorType DateSigned = new(
        Values.DateSigned
    );

    public static readonly CreateSignTemplateRequestFieldsItemAnchorType Name = new(Values.Name);

    public static readonly CreateSignTemplateRequestFieldsItemAnchorType Email = new(Values.Email);

    public static readonly CreateSignTemplateRequestFieldsItemAnchorType Text = new(Values.Text);

    public static readonly CreateSignTemplateRequestFieldsItemAnchorType Checkbox = new(
        Values.Checkbox
    );

    public CreateSignTemplateRequestFieldsItemAnchorType(string value)
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
    public static CreateSignTemplateRequestFieldsItemAnchorType FromCustom(string value)
    {
        return new CreateSignTemplateRequestFieldsItemAnchorType(value);
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

    public static bool operator ==(
        CreateSignTemplateRequestFieldsItemAnchorType value1,
        string value2
    ) => value1.Value.Equals(value2);

    public static bool operator !=(
        CreateSignTemplateRequestFieldsItemAnchorType value1,
        string value2
    ) => !value1.Value.Equals(value2);

    public static explicit operator string(CreateSignTemplateRequestFieldsItemAnchorType value) =>
        value.Value;

    public static explicit operator CreateSignTemplateRequestFieldsItemAnchorType(string value) =>
        new(value);

    internal class CreateSignTemplateRequestFieldsItemAnchorTypeSerializer
        : JsonConverter<CreateSignTemplateRequestFieldsItemAnchorType>
    {
        public override CreateSignTemplateRequestFieldsItemAnchorType Read(
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
            return new CreateSignTemplateRequestFieldsItemAnchorType(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            CreateSignTemplateRequestFieldsItemAnchorType value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override CreateSignTemplateRequestFieldsItemAnchorType ReadAsPropertyName(
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
            return new CreateSignTemplateRequestFieldsItemAnchorType(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            CreateSignTemplateRequestFieldsItemAnchorType value,
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
        public const string Signature = "signature";

        public const string Initials = "initials";

        public const string DateSigned = "date_signed";

        public const string Name = "name";

        public const string Email = "email";

        public const string Text = "text";

        public const string Checkbox = "checkbox";
    }
}
