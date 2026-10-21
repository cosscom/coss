using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss.Email;

[JsonConverter(typeof(ExportSuppressionsRequestReason.ExportSuppressionsRequestReasonSerializer))]
[Serializable]
public readonly record struct ExportSuppressionsRequestReason : IStringEnum
{
    public static readonly ExportSuppressionsRequestReason Bounce = new(Values.Bounce);

    public static readonly ExportSuppressionsRequestReason Complaint = new(Values.Complaint);

    public static readonly ExportSuppressionsRequestReason Manual = new(Values.Manual);

    public static readonly ExportSuppressionsRequestReason Import = new(Values.Import);

    public static readonly ExportSuppressionsRequestReason Unsubscribe = new(Values.Unsubscribe);

    public ExportSuppressionsRequestReason(string value)
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
    public static ExportSuppressionsRequestReason FromCustom(string value)
    {
        return new ExportSuppressionsRequestReason(value);
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

    public static bool operator ==(ExportSuppressionsRequestReason value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(ExportSuppressionsRequestReason value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(ExportSuppressionsRequestReason value) => value.Value;

    public static explicit operator ExportSuppressionsRequestReason(string value) => new(value);

    internal class ExportSuppressionsRequestReasonSerializer
        : JsonConverter<ExportSuppressionsRequestReason>
    {
        public override ExportSuppressionsRequestReason Read(
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
            return new ExportSuppressionsRequestReason(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            ExportSuppressionsRequestReason value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override ExportSuppressionsRequestReason ReadAsPropertyName(
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
            return new ExportSuppressionsRequestReason(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            ExportSuppressionsRequestReason value,
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
        public const string Bounce = "bounce";

        public const string Complaint = "complaint";

        public const string Manual = "manual";

        public const string Import = "import";

        public const string Unsubscribe = "unsubscribe";
    }
}
