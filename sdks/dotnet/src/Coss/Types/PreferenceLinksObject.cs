using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(PreferenceLinksObject.PreferenceLinksObjectSerializer))]
[Serializable]
public readonly record struct PreferenceLinksObject : IStringEnum
{
    public static readonly PreferenceLinksObject PreferenceLinks = new(Values.PreferenceLinks);

    public PreferenceLinksObject(string value)
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
    public static PreferenceLinksObject FromCustom(string value)
    {
        return new PreferenceLinksObject(value);
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

    public static bool operator ==(PreferenceLinksObject value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(PreferenceLinksObject value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(PreferenceLinksObject value) => value.Value;

    public static explicit operator PreferenceLinksObject(string value) => new(value);

    internal class PreferenceLinksObjectSerializer : JsonConverter<PreferenceLinksObject>
    {
        public override PreferenceLinksObject Read(
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
            return new PreferenceLinksObject(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            PreferenceLinksObject value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override PreferenceLinksObject ReadAsPropertyName(
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
            return new PreferenceLinksObject(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            PreferenceLinksObject value,
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
        public const string PreferenceLinks = "preference_links";
    }
}
