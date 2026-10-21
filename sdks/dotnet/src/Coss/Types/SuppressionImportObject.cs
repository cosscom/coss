using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(SuppressionImportObject.SuppressionImportObjectSerializer))]
[Serializable]
public readonly record struct SuppressionImportObject : IStringEnum
{
    public static readonly SuppressionImportObject SuppressionImport = new(
        Values.SuppressionImport
    );

    public SuppressionImportObject(string value)
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
    public static SuppressionImportObject FromCustom(string value)
    {
        return new SuppressionImportObject(value);
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

    public static bool operator ==(SuppressionImportObject value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(SuppressionImportObject value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(SuppressionImportObject value) => value.Value;

    public static explicit operator SuppressionImportObject(string value) => new(value);

    internal class SuppressionImportObjectSerializer : JsonConverter<SuppressionImportObject>
    {
        public override SuppressionImportObject Read(
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
            return new SuppressionImportObject(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            SuppressionImportObject value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override SuppressionImportObject ReadAsPropertyName(
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
            return new SuppressionImportObject(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            SuppressionImportObject value,
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
        public const string SuppressionImport = "suppression_import";
    }
}
