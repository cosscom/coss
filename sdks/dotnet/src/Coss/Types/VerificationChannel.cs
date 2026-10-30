using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(VerificationChannel.VerificationChannelSerializer))]
[Serializable]
public readonly record struct VerificationChannel : IStringEnum
{
    public static readonly VerificationChannel Sms = new(Values.Sms);

    public static readonly VerificationChannel Email = new(Values.Email);

    public VerificationChannel(string value)
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
    public static VerificationChannel FromCustom(string value)
    {
        return new VerificationChannel(value);
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

    public static bool operator ==(VerificationChannel value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(VerificationChannel value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(VerificationChannel value) => value.Value;

    public static explicit operator VerificationChannel(string value) => new(value);

    internal class VerificationChannelSerializer : JsonConverter<VerificationChannel>
    {
        public override VerificationChannel Read(
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
            return new VerificationChannel(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            VerificationChannel value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override VerificationChannel ReadAsPropertyName(
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
            return new VerificationChannel(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            VerificationChannel value,
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
        public const string Sms = "sms";

        public const string Email = "email";
    }
}
