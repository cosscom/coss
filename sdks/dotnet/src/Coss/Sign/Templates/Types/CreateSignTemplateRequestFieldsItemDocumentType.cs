using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss.Sign;

[JsonConverter(
    typeof(CreateSignTemplateRequestFieldsItemDocumentType.CreateSignTemplateRequestFieldsItemDocumentTypeSerializer)
)]
[Serializable]
public readonly record struct CreateSignTemplateRequestFieldsItemDocumentType : IStringEnum
{
    public static readonly CreateSignTemplateRequestFieldsItemDocumentType Signature = new(
        Values.Signature
    );

    public static readonly CreateSignTemplateRequestFieldsItemDocumentType Initials = new(
        Values.Initials
    );

    public static readonly CreateSignTemplateRequestFieldsItemDocumentType DateSigned = new(
        Values.DateSigned
    );

    public static readonly CreateSignTemplateRequestFieldsItemDocumentType Name = new(Values.Name);

    public static readonly CreateSignTemplateRequestFieldsItemDocumentType Email = new(
        Values.Email
    );

    public static readonly CreateSignTemplateRequestFieldsItemDocumentType Text = new(Values.Text);

    public static readonly CreateSignTemplateRequestFieldsItemDocumentType Checkbox = new(
        Values.Checkbox
    );

    public CreateSignTemplateRequestFieldsItemDocumentType(string value)
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
    public static CreateSignTemplateRequestFieldsItemDocumentType FromCustom(string value)
    {
        return new CreateSignTemplateRequestFieldsItemDocumentType(value);
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
        CreateSignTemplateRequestFieldsItemDocumentType value1,
        string value2
    ) => value1.Value.Equals(value2);

    public static bool operator !=(
        CreateSignTemplateRequestFieldsItemDocumentType value1,
        string value2
    ) => !value1.Value.Equals(value2);

    public static explicit operator string(CreateSignTemplateRequestFieldsItemDocumentType value) =>
        value.Value;

    public static explicit operator CreateSignTemplateRequestFieldsItemDocumentType(string value) =>
        new(value);

    internal class CreateSignTemplateRequestFieldsItemDocumentTypeSerializer
        : JsonConverter<CreateSignTemplateRequestFieldsItemDocumentType>
    {
        public override CreateSignTemplateRequestFieldsItemDocumentType Read(
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
            return new CreateSignTemplateRequestFieldsItemDocumentType(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            CreateSignTemplateRequestFieldsItemDocumentType value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override CreateSignTemplateRequestFieldsItemDocumentType ReadAsPropertyName(
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
            return new CreateSignTemplateRequestFieldsItemDocumentType(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            CreateSignTemplateRequestFieldsItemDocumentType value,
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
