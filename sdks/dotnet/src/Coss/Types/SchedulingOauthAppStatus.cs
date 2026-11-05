using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(SchedulingOauthAppStatus.SchedulingOauthAppStatusSerializer))]
[Serializable]
public readonly record struct SchedulingOauthAppStatus : IStringEnum
{
    public static readonly SchedulingOauthAppStatus Active = new(Values.Active);

    public static readonly SchedulingOauthAppStatus Failing = new(Values.Failing);

    public SchedulingOauthAppStatus(string value)
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
    public static SchedulingOauthAppStatus FromCustom(string value)
    {
        return new SchedulingOauthAppStatus(value);
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

    public static bool operator ==(SchedulingOauthAppStatus value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(SchedulingOauthAppStatus value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(SchedulingOauthAppStatus value) => value.Value;

    public static explicit operator SchedulingOauthAppStatus(string value) => new(value);

    internal class SchedulingOauthAppStatusSerializer : JsonConverter<SchedulingOauthAppStatus>
    {
        public override SchedulingOauthAppStatus Read(
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
            return new SchedulingOauthAppStatus(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            SchedulingOauthAppStatus value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override SchedulingOauthAppStatus ReadAsPropertyName(
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
            return new SchedulingOauthAppStatus(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            SchedulingOauthAppStatus value,
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
        public const string Active = "active";

        public const string Failing = "failing";
    }
}
