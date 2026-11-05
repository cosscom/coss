using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(SchedulingOauthAppProvider.SchedulingOauthAppProviderSerializer))]
[Serializable]
public readonly record struct SchedulingOauthAppProvider : IStringEnum
{
    public static readonly SchedulingOauthAppProvider Google = new(Values.Google);

    public static readonly SchedulingOauthAppProvider Microsoft = new(Values.Microsoft);

    public static readonly SchedulingOauthAppProvider Zoom = new(Values.Zoom);

    public SchedulingOauthAppProvider(string value)
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
    public static SchedulingOauthAppProvider FromCustom(string value)
    {
        return new SchedulingOauthAppProvider(value);
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

    public static bool operator ==(SchedulingOauthAppProvider value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(SchedulingOauthAppProvider value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(SchedulingOauthAppProvider value) => value.Value;

    public static explicit operator SchedulingOauthAppProvider(string value) => new(value);

    internal class SchedulingOauthAppProviderSerializer : JsonConverter<SchedulingOauthAppProvider>
    {
        public override SchedulingOauthAppProvider Read(
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
            return new SchedulingOauthAppProvider(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            SchedulingOauthAppProvider value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override SchedulingOauthAppProvider ReadAsPropertyName(
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
            return new SchedulingOauthAppProvider(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            SchedulingOauthAppProvider value,
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
        public const string Google = "google";

        public const string Microsoft = "microsoft";

        public const string Zoom = "zoom";
    }
}
