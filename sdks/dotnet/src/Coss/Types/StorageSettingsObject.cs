using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(StorageSettingsObject.StorageSettingsObjectSerializer))]
[Serializable]
public readonly record struct StorageSettingsObject : IStringEnum
{
    public static readonly StorageSettingsObject StorageSettings = new(Values.StorageSettings);

    public StorageSettingsObject(string value)
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
    public static StorageSettingsObject FromCustom(string value)
    {
        return new StorageSettingsObject(value);
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

    public static bool operator ==(StorageSettingsObject value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(StorageSettingsObject value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(StorageSettingsObject value) => value.Value;

    public static explicit operator StorageSettingsObject(string value) => new(value);

    internal class StorageSettingsObjectSerializer : JsonConverter<StorageSettingsObject>
    {
        public override StorageSettingsObject Read(
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
            return new StorageSettingsObject(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            StorageSettingsObject value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override StorageSettingsObject ReadAsPropertyName(
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
            return new StorageSettingsObject(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            StorageSettingsObject value,
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
        public const string StorageSettings = "storage_settings";
    }
}
