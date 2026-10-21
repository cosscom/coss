using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss.Email;

[JsonConverter(
    typeof(UpdateStorageSettingsRequestContentStorage.UpdateStorageSettingsRequestContentStorageSerializer)
)]
[Serializable]
public readonly record struct UpdateStorageSettingsRequestContentStorage : IStringEnum
{
    public static readonly UpdateStorageSettingsRequestContentStorage Store = new(Values.Store);

    public static readonly UpdateStorageSettingsRequestContentStorage Discard = new(Values.Discard);

    public UpdateStorageSettingsRequestContentStorage(string value)
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
    public static UpdateStorageSettingsRequestContentStorage FromCustom(string value)
    {
        return new UpdateStorageSettingsRequestContentStorage(value);
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
        UpdateStorageSettingsRequestContentStorage value1,
        string value2
    ) => value1.Value.Equals(value2);

    public static bool operator !=(
        UpdateStorageSettingsRequestContentStorage value1,
        string value2
    ) => !value1.Value.Equals(value2);

    public static explicit operator string(UpdateStorageSettingsRequestContentStorage value) =>
        value.Value;

    public static explicit operator UpdateStorageSettingsRequestContentStorage(string value) =>
        new(value);

    internal class UpdateStorageSettingsRequestContentStorageSerializer
        : JsonConverter<UpdateStorageSettingsRequestContentStorage>
    {
        public override UpdateStorageSettingsRequestContentStorage Read(
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
            return new UpdateStorageSettingsRequestContentStorage(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            UpdateStorageSettingsRequestContentStorage value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override UpdateStorageSettingsRequestContentStorage ReadAsPropertyName(
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
            return new UpdateStorageSettingsRequestContentStorage(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            UpdateStorageSettingsRequestContentStorage value,
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
