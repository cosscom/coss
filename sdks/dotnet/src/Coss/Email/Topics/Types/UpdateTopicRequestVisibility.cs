using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss.Email;

[JsonConverter(typeof(UpdateTopicRequestVisibility.UpdateTopicRequestVisibilitySerializer))]
[Serializable]
public readonly record struct UpdateTopicRequestVisibility : IStringEnum
{
    public static readonly UpdateTopicRequestVisibility Public = new(Values.Public);

    public static readonly UpdateTopicRequestVisibility Private = new(Values.Private);

    public UpdateTopicRequestVisibility(string value)
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
    public static UpdateTopicRequestVisibility FromCustom(string value)
    {
        return new UpdateTopicRequestVisibility(value);
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

    public static bool operator ==(UpdateTopicRequestVisibility value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(UpdateTopicRequestVisibility value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(UpdateTopicRequestVisibility value) => value.Value;

    public static explicit operator UpdateTopicRequestVisibility(string value) => new(value);

    internal class UpdateTopicRequestVisibilitySerializer
        : JsonConverter<UpdateTopicRequestVisibility>
    {
        public override UpdateTopicRequestVisibility Read(
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
            return new UpdateTopicRequestVisibility(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            UpdateTopicRequestVisibility value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override UpdateTopicRequestVisibility ReadAsPropertyName(
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
            return new UpdateTopicRequestVisibility(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            UpdateTopicRequestVisibility value,
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
