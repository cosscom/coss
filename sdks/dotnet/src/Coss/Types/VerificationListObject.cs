using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(VerificationListObject.VerificationListObjectSerializer))]
[Serializable]
public readonly record struct VerificationListObject : IStringEnum
{
    public static readonly VerificationListObject List = new(Values.List);

    public VerificationListObject(string value)
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
    public static VerificationListObject FromCustom(string value)
    {
        return new VerificationListObject(value);
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

    public static bool operator ==(VerificationListObject value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(VerificationListObject value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(VerificationListObject value) => value.Value;

    public static explicit operator VerificationListObject(string value) => new(value);

    internal class VerificationListObjectSerializer : JsonConverter<VerificationListObject>
    {
        public override VerificationListObject Read(
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
            return new VerificationListObject(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            VerificationListObject value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override VerificationListObject ReadAsPropertyName(
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
            return new VerificationListObject(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            VerificationListObject value,
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
        public const string List = "list";
    }
}
