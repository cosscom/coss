using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(
    typeof(ExportSuppressionsRequestScopeZero.ExportSuppressionsRequestScopeZeroSerializer)
)]
[Serializable]
public readonly record struct ExportSuppressionsRequestScopeZero : IStringEnum
{
    public static readonly ExportSuppressionsRequestScopeZero All = new(Values.All);

    public ExportSuppressionsRequestScopeZero(string value)
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
    public static ExportSuppressionsRequestScopeZero FromCustom(string value)
    {
        return new ExportSuppressionsRequestScopeZero(value);
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

    public static bool operator ==(ExportSuppressionsRequestScopeZero value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(ExportSuppressionsRequestScopeZero value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(ExportSuppressionsRequestScopeZero value) => value.Value;

    public static explicit operator ExportSuppressionsRequestScopeZero(string value) => new(value);

    internal class ExportSuppressionsRequestScopeZeroSerializer
        : JsonConverter<ExportSuppressionsRequestScopeZero>
    {
        public override ExportSuppressionsRequestScopeZero Read(
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
            return new ExportSuppressionsRequestScopeZero(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            ExportSuppressionsRequestScopeZero value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override ExportSuppressionsRequestScopeZero ReadAsPropertyName(
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
            return new ExportSuppressionsRequestScopeZero(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            ExportSuppressionsRequestScopeZero value,
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
        public const string All = "*";
    }
}
