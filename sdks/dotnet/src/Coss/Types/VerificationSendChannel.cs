using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(VerificationSendChannel.VerificationSendChannelSerializer))]
[Serializable]
public readonly record struct VerificationSendChannel : IStringEnum
{
    public static readonly VerificationSendChannel Sms = new(Values.Sms);

    public static readonly VerificationSendChannel Email = new(Values.Email);

    public VerificationSendChannel(string value)
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
    public static VerificationSendChannel FromCustom(string value)
    {
        return new VerificationSendChannel(value);
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

    public static bool operator ==(VerificationSendChannel value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(VerificationSendChannel value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(VerificationSendChannel value) => value.Value;

    public static explicit operator VerificationSendChannel(string value) => new(value);

    internal class VerificationSendChannelSerializer : JsonConverter<VerificationSendChannel>
    {
        public override VerificationSendChannel Read(
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
            return new VerificationSendChannel(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            VerificationSendChannel value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override VerificationSendChannel ReadAsPropertyName(
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
            return new VerificationSendChannel(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            VerificationSendChannel value,
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
