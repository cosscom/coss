using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(StorageSettingsContentStorage.StorageSettingsContentStorageSerializer))]
[Serializable]
public readonly record struct StorageSettingsContentStorage : IStringEnum
{
    public static readonly StorageSettingsContentStorage Store = new(Values.Store);

    public static readonly StorageSettingsContentStorage Discard = new(Values.Discard);

    public StorageSettingsContentStorage(string value)
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
    public static StorageSettingsContentStorage FromCustom(string value)
    {
        return new StorageSettingsContentStorage(value);
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

    public static bool operator ==(StorageSettingsContentStorage value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(StorageSettingsContentStorage value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(StorageSettingsContentStorage value) => value.Value;

    public static explicit operator StorageSettingsContentStorage(string value) => new(value);

    internal class StorageSettingsContentStorageSerializer
        : JsonConverter<StorageSettingsContentStorage>
    {
        public override StorageSettingsContentStorage Read(
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
            return new StorageSettingsContentStorage(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            StorageSettingsContentStorage value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override StorageSettingsContentStorage ReadAsPropertyName(
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
            return new StorageSettingsContentStorage(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            StorageSettingsContentStorage value,
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
        public const string Store = "store";

        public const string Discard = "discard";
    }
}
