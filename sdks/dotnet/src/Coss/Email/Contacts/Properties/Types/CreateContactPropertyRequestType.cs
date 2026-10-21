using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss.Email.Contacts;

[JsonConverter(typeof(CreateContactPropertyRequestType.CreateContactPropertyRequestTypeSerializer))]
[Serializable]
public readonly record struct CreateContactPropertyRequestType : IStringEnum
{
    public static readonly CreateContactPropertyRequestType String = new(Values.String);

    public static readonly CreateContactPropertyRequestType Number = new(Values.Number);

    public static readonly CreateContactPropertyRequestType Boolean = new(Values.Boolean);

    public static readonly CreateContactPropertyRequestType Date = new(Values.Date);

    public CreateContactPropertyRequestType(string value)
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
    public static CreateContactPropertyRequestType FromCustom(string value)
    {
        return new CreateContactPropertyRequestType(value);
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

    public static bool operator ==(CreateContactPropertyRequestType value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(CreateContactPropertyRequestType value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(CreateContactPropertyRequestType value) => value.Value;

    public static explicit operator CreateContactPropertyRequestType(string value) => new(value);

    internal class CreateContactPropertyRequestTypeSerializer
        : JsonConverter<CreateContactPropertyRequestType>
    {
        public override CreateContactPropertyRequestType Read(
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
            return new CreateContactPropertyRequestType(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            CreateContactPropertyRequestType value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override CreateContactPropertyRequestType ReadAsPropertyName(
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
            return new CreateContactPropertyRequestType(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            CreateContactPropertyRequestType value,
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

        public const string Date = "date";
    }
}
