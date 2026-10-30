using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(SignSignerStatus.SignSignerStatusSerializer))]
[Serializable]
public readonly record struct SignSignerStatus : IStringEnum
{
    public static readonly SignSignerStatus Pending = new(Values.Pending);

    public static readonly SignSignerStatus Notified = new(Values.Notified);

    public static readonly SignSignerStatus Viewed = new(Values.Viewed);

    public static readonly SignSignerStatus Signed = new(Values.Signed);

    public static readonly SignSignerStatus Declined = new(Values.Declined);

    public SignSignerStatus(string value)
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
    public static SignSignerStatus FromCustom(string value)
    {
        return new SignSignerStatus(value);
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

    public static bool operator ==(SignSignerStatus value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(SignSignerStatus value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(SignSignerStatus value) => value.Value;

    public static explicit operator SignSignerStatus(string value) => new(value);

    internal class SignSignerStatusSerializer : JsonConverter<SignSignerStatus>
    {
        public override SignSignerStatus Read(
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
            return new SignSignerStatus(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            SignSignerStatus value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override SignSignerStatus ReadAsPropertyName(
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
            return new SignSignerStatus(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            SignSignerStatus value,
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
        public const string Pending = "pending";

        public const string Notified = "notified";

        public const string Viewed = "viewed";

        public const string Signed = "signed";

        public const string Declined = "declined";
    }
}
