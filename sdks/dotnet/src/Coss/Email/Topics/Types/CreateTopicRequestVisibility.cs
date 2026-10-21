using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss.Email;

[JsonConverter(typeof(CreateTopicRequestVisibility.CreateTopicRequestVisibilitySerializer))]
[Serializable]
public readonly record struct CreateTopicRequestVisibility : IStringEnum
{
    public static readonly CreateTopicRequestVisibility Public = new(Values.Public);

    public static readonly CreateTopicRequestVisibility Private = new(Values.Private);

    public CreateTopicRequestVisibility(string value)
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
    public static CreateTopicRequestVisibility FromCustom(string value)
    {
        return new CreateTopicRequestVisibility(value);
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

    public static bool operator ==(CreateTopicRequestVisibility value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(CreateTopicRequestVisibility value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(CreateTopicRequestVisibility value) => value.Value;

    public static explicit operator CreateTopicRequestVisibility(string value) => new(value);

    internal class CreateTopicRequestVisibilitySerializer
        : JsonConverter<CreateTopicRequestVisibility>
    {
        public override CreateTopicRequestVisibility Read(
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
            return new CreateTopicRequestVisibility(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            CreateTopicRequestVisibility value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override CreateTopicRequestVisibility ReadAsPropertyName(
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
            return new CreateTopicRequestVisibility(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            CreateTopicRequestVisibility value,
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
        public const string Public = "public";

        public const string Private = "private";
    }
}
