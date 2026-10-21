using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(RiskSettingsCaptchaProvider.RiskSettingsCaptchaProviderSerializer))]
[Serializable]
public readonly record struct RiskSettingsCaptchaProvider : IStringEnum
{
    public static readonly RiskSettingsCaptchaProvider Turnstile = new(Values.Turnstile);

    public static readonly RiskSettingsCaptchaProvider Hcaptcha = new(Values.Hcaptcha);

    public RiskSettingsCaptchaProvider(string value)
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
    public static RiskSettingsCaptchaProvider FromCustom(string value)
    {
        return new RiskSettingsCaptchaProvider(value);
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

    public static bool operator ==(RiskSettingsCaptchaProvider value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(RiskSettingsCaptchaProvider value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(RiskSettingsCaptchaProvider value) => value.Value;

    public static explicit operator RiskSettingsCaptchaProvider(string value) => new(value);

    internal class RiskSettingsCaptchaProviderSerializer
        : JsonConverter<RiskSettingsCaptchaProvider>
    {
        public override RiskSettingsCaptchaProvider Read(
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
            return new RiskSettingsCaptchaProvider(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            RiskSettingsCaptchaProvider value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override RiskSettingsCaptchaProvider ReadAsPropertyName(
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
            return new RiskSettingsCaptchaProvider(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            RiskSettingsCaptchaProvider value,
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
        public const string Turnstile = "turnstile";

        public const string Hcaptcha = "hcaptcha";
    }
}
