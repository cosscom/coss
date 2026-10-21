using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(
    typeof(ExportSuppressionsRequestScopeOne.ExportSuppressionsRequestScopeOneSerializer)
)]
[Serializable]
public readonly record struct ExportSuppressionsRequestScopeOne : IStringEnum
{
    public static readonly ExportSuppressionsRequestScopeOne StreamMarketing = new(
        Values.StreamMarketing
    );

    public ExportSuppressionsRequestScopeOne(string value)
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
    public static ExportSuppressionsRequestScopeOne FromCustom(string value)
    {
        return new ExportSuppressionsRequestScopeOne(value);
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

    public static bool operator ==(ExportSuppressionsRequestScopeOne value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(ExportSuppressionsRequestScopeOne value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(ExportSuppressionsRequestScopeOne value) => value.Value;

    public static explicit operator ExportSuppressionsRequestScopeOne(string value) => new(value);

    internal class ExportSuppressionsRequestScopeOneSerializer
        : JsonConverter<ExportSuppressionsRequestScopeOne>
    {
        public override ExportSuppressionsRequestScopeOne Read(
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
            return new ExportSuppressionsRequestScopeOne(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            ExportSuppressionsRequestScopeOne value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override ExportSuppressionsRequestScopeOne ReadAsPropertyName(
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
            return new ExportSuppressionsRequestScopeOne(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            ExportSuppressionsRequestScopeOne value,
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
        public const string StreamMarketing = "stream:marketing";
    }
}
