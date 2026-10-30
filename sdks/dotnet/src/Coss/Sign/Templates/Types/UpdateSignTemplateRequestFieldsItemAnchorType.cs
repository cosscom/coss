using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss.Sign;

[JsonConverter(
    typeof(UpdateSignTemplateRequestFieldsItemAnchorType.UpdateSignTemplateRequestFieldsItemAnchorTypeSerializer)
)]
[Serializable]
public readonly record struct UpdateSignTemplateRequestFieldsItemAnchorType : IStringEnum
{
    public static readonly UpdateSignTemplateRequestFieldsItemAnchorType Signature = new(
        Values.Signature
    );

    public static readonly UpdateSignTemplateRequestFieldsItemAnchorType Initials = new(
        Values.Initials
    );

    public static readonly UpdateSignTemplateRequestFieldsItemAnchorType DateSigned = new(
        Values.DateSigned
    );

    public static readonly UpdateSignTemplateRequestFieldsItemAnchorType Name = new(Values.Name);

    public static readonly UpdateSignTemplateRequestFieldsItemAnchorType Email = new(Values.Email);

    public static readonly UpdateSignTemplateRequestFieldsItemAnchorType Text = new(Values.Text);

    public static readonly UpdateSignTemplateRequestFieldsItemAnchorType Checkbox = new(
        Values.Checkbox
    );

    public UpdateSignTemplateRequestFieldsItemAnchorType(string value)
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
    public static UpdateSignTemplateRequestFieldsItemAnchorType FromCustom(string value)
    {
        return new UpdateSignTemplateRequestFieldsItemAnchorType(value);
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
        UpdateSignTemplateRequestFieldsItemAnchorType value1,
        string value2
    ) => value1.Value.Equals(value2);

    public static bool operator !=(
        UpdateSignTemplateRequestFieldsItemAnchorType value1,
        string value2
    ) => !value1.Value.Equals(value2);

    public static explicit operator string(UpdateSignTemplateRequestFieldsItemAnchorType value) =>
        value.Value;

    public static explicit operator UpdateSignTemplateRequestFieldsItemAnchorType(string value) =>
        new(value);

    internal class UpdateSignTemplateRequestFieldsItemAnchorTypeSerializer
        : JsonConverter<UpdateSignTemplateRequestFieldsItemAnchorType>
    {
        public override UpdateSignTemplateRequestFieldsItemAnchorType Read(
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
            return new UpdateSignTemplateRequestFieldsItemAnchorType(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            UpdateSignTemplateRequestFieldsItemAnchorType value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override UpdateSignTemplateRequestFieldsItemAnchorType ReadAsPropertyName(
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
            return new UpdateSignTemplateRequestFieldsItemAnchorType(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            UpdateSignTemplateRequestFieldsItemAnchorType value,
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
