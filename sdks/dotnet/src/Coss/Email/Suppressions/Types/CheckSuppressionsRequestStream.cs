using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss.Email;

[JsonConverter(typeof(CheckSuppressionsRequestStream.CheckSuppressionsRequestStreamSerializer))]
[Serializable]
public readonly record struct CheckSuppressionsRequestStream : IStringEnum
{
    public static readonly CheckSuppressionsRequestStream Transactional = new(Values.Transactional);

    public static readonly CheckSuppressionsRequestStream Marketing = new(Values.Marketing);

    public CheckSuppressionsRequestStream(string value)
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
    public static CheckSuppressionsRequestStream FromCustom(string value)
    {
        return new CheckSuppressionsRequestStream(value);
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

    public static bool operator ==(CheckSuppressionsRequestStream value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(CheckSuppressionsRequestStream value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(CheckSuppressionsRequestStream value) => value.Value;

    public static explicit operator CheckSuppressionsRequestStream(string value) => new(value);

    internal class CheckSuppressionsRequestStreamSerializer
        : JsonConverter<CheckSuppressionsRequestStream>
    {
        public override CheckSuppressionsRequestStream Read(
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
            return new CheckSuppressionsRequestStream(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            CheckSuppressionsRequestStream value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override CheckSuppressionsRequestStream ReadAsPropertyName(
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
            return new CheckSuppressionsRequestStream(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            CheckSuppressionsRequestStream value,
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
        public const string Transactional = "transactional";

        public const string Marketing = "marketing";
    }
}
