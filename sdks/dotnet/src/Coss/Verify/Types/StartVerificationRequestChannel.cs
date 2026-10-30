using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(StartVerificationRequestChannel.StartVerificationRequestChannelSerializer))]
[Serializable]
public readonly record struct StartVerificationRequestChannel : IStringEnum
{
    public static readonly StartVerificationRequestChannel Sms = new(Values.Sms);

    public static readonly StartVerificationRequestChannel Email = new(Values.Email);

    public StartVerificationRequestChannel(string value)
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
    public static StartVerificationRequestChannel FromCustom(string value)
    {
        return new StartVerificationRequestChannel(value);
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

    public static bool operator ==(StartVerificationRequestChannel value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(StartVerificationRequestChannel value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(StartVerificationRequestChannel value) => value.Value;

    public static explicit operator StartVerificationRequestChannel(string value) => new(value);

    internal class StartVerificationRequestChannelSerializer
        : JsonConverter<StartVerificationRequestChannel>
    {
        public override StartVerificationRequestChannel Read(
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
            return new StartVerificationRequestChannel(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            StartVerificationRequestChannel value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override StartVerificationRequestChannel ReadAsPropertyName(
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
            return new StartVerificationRequestChannel(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            StartVerificationRequestChannel value,
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
