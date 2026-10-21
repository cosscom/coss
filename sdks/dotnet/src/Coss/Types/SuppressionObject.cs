using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(SuppressionObject.SuppressionObjectSerializer))]
[Serializable]
public readonly record struct SuppressionObject : IStringEnum
{
    public static readonly SuppressionObject Suppression = new(Values.Suppression);

    public SuppressionObject(string value)
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
    public static SuppressionObject FromCustom(string value)
    {
        return new SuppressionObject(value);
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

    public static bool operator ==(SuppressionObject value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(SuppressionObject value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(SuppressionObject value) => value.Value;

    public static explicit operator SuppressionObject(string value) => new(value);

    internal class SuppressionObjectSerializer : JsonConverter<SuppressionObject>
    {
        public override SuppressionObject Read(
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
            return new SuppressionObject(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            SuppressionObject value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override SuppressionObject ReadAsPropertyName(
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
            return new SuppressionObject(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            SuppressionObject value,
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
        public const string Suppression = "suppression";
    }
}
