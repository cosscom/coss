using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss.Email;

[JsonConverter(
    typeof(RemoveContactAudiencesResponseObject.RemoveContactAudiencesResponseObjectSerializer)
)]
[Serializable]
public readonly record struct RemoveContactAudiencesResponseObject : IStringEnum
{
    public static readonly RemoveContactAudiencesResponseObject AudienceContact = new(
        Values.AudienceContact
    );

    public RemoveContactAudiencesResponseObject(string value)
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
    public static RemoveContactAudiencesResponseObject FromCustom(string value)
    {
        return new RemoveContactAudiencesResponseObject(value);
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

    public static bool operator ==(RemoveContactAudiencesResponseObject value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(RemoveContactAudiencesResponseObject value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(RemoveContactAudiencesResponseObject value) =>
        value.Value;

    public static explicit operator RemoveContactAudiencesResponseObject(string value) =>
        new(value);

    internal class RemoveContactAudiencesResponseObjectSerializer
        : JsonConverter<RemoveContactAudiencesResponseObject>
    {
        public override RemoveContactAudiencesResponseObject Read(
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
            return new RemoveContactAudiencesResponseObject(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            RemoveContactAudiencesResponseObject value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override RemoveContactAudiencesResponseObject ReadAsPropertyName(
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
            return new RemoveContactAudiencesResponseObject(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            RemoveContactAudiencesResponseObject value,
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
        public const string AudienceContact = "audience_contact";
    }
}
