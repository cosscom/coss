using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss.Risk;

[JsonConverter(
    typeof(UpdateRiskSettingsRequestCaptchaProvider.UpdateRiskSettingsRequestCaptchaProviderSerializer)
)]
[Serializable]
public readonly record struct UpdateRiskSettingsRequestCaptchaProvider : IStringEnum
{
    public static readonly UpdateRiskSettingsRequestCaptchaProvider Turnstile = new(
        Values.Turnstile
    );

    public static readonly UpdateRiskSettingsRequestCaptchaProvider Hcaptcha = new(Values.Hcaptcha);

    public UpdateRiskSettingsRequestCaptchaProvider(string value)
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
    public static UpdateRiskSettingsRequestCaptchaProvider FromCustom(string value)
    {
        return new UpdateRiskSettingsRequestCaptchaProvider(value);
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
        UpdateRiskSettingsRequestCaptchaProvider value1,
        string value2
    ) => value1.Value.Equals(value2);

    public static bool operator !=(
        UpdateRiskSettingsRequestCaptchaProvider value1,
        string value2
    ) => !value1.Value.Equals(value2);

    public static explicit operator string(UpdateRiskSettingsRequestCaptchaProvider value) =>
        value.Value;

    public static explicit operator UpdateRiskSettingsRequestCaptchaProvider(string value) =>
        new(value);

    internal class UpdateRiskSettingsRequestCaptchaProviderSerializer
        : JsonConverter<UpdateRiskSettingsRequestCaptchaProvider>
    {
        public override UpdateRiskSettingsRequestCaptchaProvider Read(
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
            return new UpdateRiskSettingsRequestCaptchaProvider(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            UpdateRiskSettingsRequestCaptchaProvider value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override UpdateRiskSettingsRequestCaptchaProvider ReadAsPropertyName(
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
            return new UpdateRiskSettingsRequestCaptchaProvider(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            UpdateRiskSettingsRequestCaptchaProvider value,
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
