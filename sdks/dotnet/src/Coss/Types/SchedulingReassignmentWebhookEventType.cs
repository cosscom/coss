using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(
    typeof(SchedulingReassignmentWebhookEventType.SchedulingReassignmentWebhookEventTypeSerializer)
)]
[Serializable]
public readonly record struct SchedulingReassignmentWebhookEventType : IStringEnum
{
    public static readonly SchedulingReassignmentWebhookEventType SchedulingReassignmentCompleted =
        new(Values.SchedulingReassignmentCompleted);

    public SchedulingReassignmentWebhookEventType(string value)
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
    public static SchedulingReassignmentWebhookEventType FromCustom(string value)
    {
        return new SchedulingReassignmentWebhookEventType(value);
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

    public static bool operator ==(SchedulingReassignmentWebhookEventType value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(SchedulingReassignmentWebhookEventType value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(SchedulingReassignmentWebhookEventType value) =>
        value.Value;

    public static explicit operator SchedulingReassignmentWebhookEventType(string value) =>
        new(value);

    internal class SchedulingReassignmentWebhookEventTypeSerializer
        : JsonConverter<SchedulingReassignmentWebhookEventType>
    {
        public override SchedulingReassignmentWebhookEventType Read(
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
            return new SchedulingReassignmentWebhookEventType(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            SchedulingReassignmentWebhookEventType value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override SchedulingReassignmentWebhookEventType ReadAsPropertyName(
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
            return new SchedulingReassignmentWebhookEventType(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            SchedulingReassignmentWebhookEventType value,
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
        public const string SchedulingReassignmentCompleted = "scheduling.reassignment.completed";
    }
}
