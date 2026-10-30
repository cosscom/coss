using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss.Sign;

[JsonConverter(typeof(UpdateSignSettingsRequestTheme.UpdateSignSettingsRequestThemeSerializer))]
[Serializable]
public readonly record struct UpdateSignSettingsRequestTheme : IStringEnum
{
    public static readonly UpdateSignSettingsRequestTheme System = new(Values.System);

    public static readonly UpdateSignSettingsRequestTheme Light = new(Values.Light);

    public static readonly UpdateSignSettingsRequestTheme Dark = new(Values.Dark);

    public UpdateSignSettingsRequestTheme(string value)
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
    public static UpdateSignSettingsRequestTheme FromCustom(string value)
    {
        return new UpdateSignSettingsRequestTheme(value);
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

    public static bool operator ==(UpdateSignSettingsRequestTheme value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(UpdateSignSettingsRequestTheme value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(UpdateSignSettingsRequestTheme value) => value.Value;

    public static explicit operator UpdateSignSettingsRequestTheme(string value) => new(value);

    internal class UpdateSignSettingsRequestThemeSerializer
        : JsonConverter<UpdateSignSettingsRequestTheme>
    {
        public override UpdateSignSettingsRequestTheme Read(
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
            return new UpdateSignSettingsRequestTheme(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            UpdateSignSettingsRequestTheme value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override UpdateSignSettingsRequestTheme ReadAsPropertyName(
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
            return new UpdateSignSettingsRequestTheme(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            UpdateSignSettingsRequestTheme value,
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
