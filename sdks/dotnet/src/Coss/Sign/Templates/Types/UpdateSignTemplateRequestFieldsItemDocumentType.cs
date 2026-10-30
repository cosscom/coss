using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss.Sign;

[JsonConverter(
    typeof(UpdateSignTemplateRequestFieldsItemDocumentType.UpdateSignTemplateRequestFieldsItemDocumentTypeSerializer)
)]
[Serializable]
public readonly record struct UpdateSignTemplateRequestFieldsItemDocumentType : IStringEnum
{
    public static readonly UpdateSignTemplateRequestFieldsItemDocumentType Signature = new(
        Values.Signature
    );

    public static readonly UpdateSignTemplateRequestFieldsItemDocumentType Initials = new(
        Values.Initials
    );

    public static readonly UpdateSignTemplateRequestFieldsItemDocumentType DateSigned = new(
        Values.DateSigned
    );

    public static readonly UpdateSignTemplateRequestFieldsItemDocumentType Name = new(Values.Name);

    public static readonly UpdateSignTemplateRequestFieldsItemDocumentType Email = new(
        Values.Email
    );

    public static readonly UpdateSignTemplateRequestFieldsItemDocumentType Text = new(Values.Text);

    public static readonly UpdateSignTemplateRequestFieldsItemDocumentType Checkbox = new(
        Values.Checkbox
    );

    public UpdateSignTemplateRequestFieldsItemDocumentType(string value)
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
    public static UpdateSignTemplateRequestFieldsItemDocumentType FromCustom(string value)
    {
        return new UpdateSignTemplateRequestFieldsItemDocumentType(value);
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
        UpdateSignTemplateRequestFieldsItemDocumentType value1,
        string value2
    ) => value1.Value.Equals(value2);

    public static bool operator !=(
        UpdateSignTemplateRequestFieldsItemDocumentType value1,
        string value2
    ) => !value1.Value.Equals(value2);

    public static explicit operator string(UpdateSignTemplateRequestFieldsItemDocumentType value) =>
        value.Value;

    public static explicit operator UpdateSignTemplateRequestFieldsItemDocumentType(string value) =>
        new(value);

    internal class UpdateSignTemplateRequestFieldsItemDocumentTypeSerializer
        : JsonConverter<UpdateSignTemplateRequestFieldsItemDocumentType>
    {
        public override UpdateSignTemplateRequestFieldsItemDocumentType Read(
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
            return new UpdateSignTemplateRequestFieldsItemDocumentType(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            UpdateSignTemplateRequestFieldsItemDocumentType value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override UpdateSignTemplateRequestFieldsItemDocumentType ReadAsPropertyName(
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
            return new UpdateSignTemplateRequestFieldsItemDocumentType(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            UpdateSignTemplateRequestFieldsItemDocumentType value,
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
