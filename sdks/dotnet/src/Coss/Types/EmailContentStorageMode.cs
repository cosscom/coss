using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(EmailContentStorageMode.EmailContentStorageModeSerializer))]
[Serializable]
public readonly record struct EmailContentStorageMode : IStringEnum
{
    public static readonly EmailContentStorageMode Store = new(Values.Store);

    public static readonly EmailContentStorageMode Discard = new(Values.Discard);

    public EmailContentStorageMode(string value)
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
    public static EmailContentStorageMode FromCustom(string value)
    {
        return new EmailContentStorageMode(value);
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

    public static bool operator ==(EmailContentStorageMode value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(EmailContentStorageMode value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(EmailContentStorageMode value) => value.Value;

    public static explicit operator EmailContentStorageMode(string value) => new(value);

    internal class EmailContentStorageModeSerializer : JsonConverter<EmailContentStorageMode>
    {
        public override EmailContentStorageMode Read(
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
            return new EmailContentStorageMode(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            EmailContentStorageMode value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override EmailContentStorageMode ReadAsPropertyName(
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
            return new EmailContentStorageMode(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            EmailContentStorageMode value,
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
