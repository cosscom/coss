using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(SmsNumberStatus.SmsNumberStatusSerializer))]
[Serializable]
public readonly record struct SmsNumberStatus : IStringEnum
{
    public static readonly SmsNumberStatus Pending = new(Values.Pending);

    public static readonly SmsNumberStatus Active = new(Values.Active);

    public static readonly SmsNumberStatus Releasing = new(Values.Releasing);

    public SmsNumberStatus(string value)
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
    public static SmsNumberStatus FromCustom(string value)
    {
        return new SmsNumberStatus(value);
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

    public static bool operator ==(SmsNumberStatus value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(SmsNumberStatus value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(SmsNumberStatus value) => value.Value;

    public static explicit operator SmsNumberStatus(string value) => new(value);

    internal class SmsNumberStatusSerializer : JsonConverter<SmsNumberStatus>
    {
        public override SmsNumberStatus Read(
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
            return new SmsNumberStatus(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            SmsNumberStatus value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override SmsNumberStatus ReadAsPropertyName(
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
            return new SmsNumberStatus(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            SmsNumberStatus value,
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

        public const string Active = "active";

        public const string Releasing = "releasing";
    }
}
