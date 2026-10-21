using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(SmsSuppressionCheckObject.SmsSuppressionCheckObjectSerializer))]
[Serializable]
public readonly record struct SmsSuppressionCheckObject : IStringEnum
{
    public static readonly SmsSuppressionCheckObject SmsSuppressionCheck = new(
        Values.SmsSuppressionCheck
    );

    public SmsSuppressionCheckObject(string value)
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
    public static SmsSuppressionCheckObject FromCustom(string value)
    {
        return new SmsSuppressionCheckObject(value);
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

    public static bool operator ==(SmsSuppressionCheckObject value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(SmsSuppressionCheckObject value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(SmsSuppressionCheckObject value) => value.Value;

    public static explicit operator SmsSuppressionCheckObject(string value) => new(value);

    internal class SmsSuppressionCheckObjectSerializer : JsonConverter<SmsSuppressionCheckObject>
    {
        public override SmsSuppressionCheckObject Read(
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
            return new SmsSuppressionCheckObject(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            SmsSuppressionCheckObject value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override SmsSuppressionCheckObject ReadAsPropertyName(
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
            return new SmsSuppressionCheckObject(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            SmsSuppressionCheckObject value,
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
        public const string SmsSuppressionCheck = "sms_suppression_check";
    }
}
