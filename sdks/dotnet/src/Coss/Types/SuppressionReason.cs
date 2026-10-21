using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(SuppressionReason.SuppressionReasonSerializer))]
[Serializable]
public readonly record struct SuppressionReason : IStringEnum
{
    public static readonly SuppressionReason Bounce = new(Values.Bounce);

    public static readonly SuppressionReason Complaint = new(Values.Complaint);

    public static readonly SuppressionReason Manual = new(Values.Manual);

    public static readonly SuppressionReason Import = new(Values.Import);

    public static readonly SuppressionReason Unsubscribe = new(Values.Unsubscribe);

    public SuppressionReason(string value)
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
    public static SuppressionReason FromCustom(string value)
    {
        return new SuppressionReason(value);
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

    public static bool operator ==(SuppressionReason value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(SuppressionReason value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(SuppressionReason value) => value.Value;

    public static explicit operator SuppressionReason(string value) => new(value);

    internal class SuppressionReasonSerializer : JsonConverter<SuppressionReason>
    {
        public override SuppressionReason Read(
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
            return new SuppressionReason(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            SuppressionReason value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override SuppressionReason ReadAsPropertyName(
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
            return new SuppressionReason(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            SuppressionReason value,
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
