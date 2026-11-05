using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(
    typeof(SchedulingReassignmentWebhookEventDataStatus.SchedulingReassignmentWebhookEventDataStatusSerializer)
)]
[Serializable]
public readonly record struct SchedulingReassignmentWebhookEventDataStatus : IStringEnum
{
    public static readonly SchedulingReassignmentWebhookEventDataStatus Completed = new(
        Values.Completed
    );

    public static readonly SchedulingReassignmentWebhookEventDataStatus Cancelled = new(
        Values.Cancelled
    );

    public SchedulingReassignmentWebhookEventDataStatus(string value)
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
    public static SchedulingReassignmentWebhookEventDataStatus FromCustom(string value)
    {
        return new SchedulingReassignmentWebhookEventDataStatus(value);
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

    public static bool operator ==(
        SchedulingReassignmentWebhookEventDataStatus value1,
        string value2
    ) => value1.Value.Equals(value2);

    public static bool operator !=(
        SchedulingReassignmentWebhookEventDataStatus value1,
        string value2
    ) => !value1.Value.Equals(value2);

    public static explicit operator string(SchedulingReassignmentWebhookEventDataStatus value) =>
        value.Value;

    public static explicit operator SchedulingReassignmentWebhookEventDataStatus(string value) =>
        new(value);

    internal class SchedulingReassignmentWebhookEventDataStatusSerializer
        : JsonConverter<SchedulingReassignmentWebhookEventDataStatus>
    {
        public override SchedulingReassignmentWebhookEventDataStatus Read(
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
            return new SchedulingReassignmentWebhookEventDataStatus(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            SchedulingReassignmentWebhookEventDataStatus value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override SchedulingReassignmentWebhookEventDataStatus ReadAsPropertyName(
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
            return new SchedulingReassignmentWebhookEventDataStatus(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            SchedulingReassignmentWebhookEventDataStatus value,
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
        public const string Completed = "completed";

        public const string Cancelled = "cancelled";
    }
}
