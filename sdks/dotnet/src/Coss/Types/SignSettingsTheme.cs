using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(SignSettingsTheme.SignSettingsThemeSerializer))]
[Serializable]
public readonly record struct SignSettingsTheme : IStringEnum
{
    public static readonly SignSettingsTheme System = new(Values.System);

    public static readonly SignSettingsTheme Light = new(Values.Light);

    public static readonly SignSettingsTheme Dark = new(Values.Dark);

    public SignSettingsTheme(string value)
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
    public static SignSettingsTheme FromCustom(string value)
    {
        return new SignSettingsTheme(value);
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

    public static bool operator ==(SignSettingsTheme value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(SignSettingsTheme value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(SignSettingsTheme value) => value.Value;

    public static explicit operator SignSettingsTheme(string value) => new(value);

    internal class SignSettingsThemeSerializer : JsonConverter<SignSettingsTheme>
    {
        public override SignSettingsTheme Read(
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
            return new SignSettingsTheme(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            SignSettingsTheme value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override SignSettingsTheme ReadAsPropertyName(
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
            return new SignSettingsTheme(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            SignSettingsTheme value,
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
        public const string System = "system";

        public const string Light = "light";

        public const string Dark = "dark";
    }
}
