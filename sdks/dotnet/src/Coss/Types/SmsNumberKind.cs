using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(SmsNumberKind.SmsNumberKindSerializer))]
[Serializable]
public readonly record struct SmsNumberKind : IStringEnum
{
    public static readonly SmsNumberKind Local = new(Values.Local);

    public static readonly SmsNumberKind TollFree = new(Values.TollFree);

    public SmsNumberKind(string value)
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
    public static SmsNumberKind FromCustom(string value)
    {
        return new SmsNumberKind(value);
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

    public static bool operator ==(SmsNumberKind value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(SmsNumberKind value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(SmsNumberKind value) => value.Value;

    public static explicit operator SmsNumberKind(string value) => new(value);

    internal class SmsNumberKindSerializer : JsonConverter<SmsNumberKind>
    {
        public override SmsNumberKind Read(
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
            return new SmsNumberKind(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            SmsNumberKind value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override SmsNumberKind ReadAsPropertyName(
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
            return new SmsNumberKind(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            SmsNumberKind value,
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
        public const string Local = "local";

        public const string TollFree = "toll_free";
    }
}
