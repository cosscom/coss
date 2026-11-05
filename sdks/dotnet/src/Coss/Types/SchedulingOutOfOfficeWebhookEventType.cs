using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(
    typeof(SchedulingOutOfOfficeWebhookEventType.SchedulingOutOfOfficeWebhookEventTypeSerializer)
)]
[Serializable]
public readonly record struct SchedulingOutOfOfficeWebhookEventType : IStringEnum
{
    public static readonly SchedulingOutOfOfficeWebhookEventType SchedulingOutOfOfficeCreated = new(
        Values.SchedulingOutOfOfficeCreated
    );

    public static readonly SchedulingOutOfOfficeWebhookEventType SchedulingOutOfOfficeUpdated = new(
        Values.SchedulingOutOfOfficeUpdated
    );

    public static readonly SchedulingOutOfOfficeWebhookEventType SchedulingOutOfOfficeDeleted = new(
        Values.SchedulingOutOfOfficeDeleted
    );

    public static readonly SchedulingOutOfOfficeWebhookEventType SchedulingOutOfOfficeStarted = new(
        Values.SchedulingOutOfOfficeStarted
    );

    public static readonly SchedulingOutOfOfficeWebhookEventType SchedulingOutOfOfficeEnded = new(
        Values.SchedulingOutOfOfficeEnded
    );

    public SchedulingOutOfOfficeWebhookEventType(string value)
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
    public static SchedulingOutOfOfficeWebhookEventType FromCustom(string value)
    {
        return new SchedulingOutOfOfficeWebhookEventType(value);
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

    public static bool operator ==(SchedulingOutOfOfficeWebhookEventType value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(SchedulingOutOfOfficeWebhookEventType value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(SchedulingOutOfOfficeWebhookEventType value) =>
        value.Value;

    public static explicit operator SchedulingOutOfOfficeWebhookEventType(string value) =>
        new(value);

    internal class SchedulingOutOfOfficeWebhookEventTypeSerializer
        : JsonConverter<SchedulingOutOfOfficeWebhookEventType>
    {
        public override SchedulingOutOfOfficeWebhookEventType Read(
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
            return new SchedulingOutOfOfficeWebhookEventType(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            SchedulingOutOfOfficeWebhookEventType value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override SchedulingOutOfOfficeWebhookEventType ReadAsPropertyName(
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
            return new SchedulingOutOfOfficeWebhookEventType(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            SchedulingOutOfOfficeWebhookEventType value,
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
        public const string SchedulingOutOfOfficeCreated = "scheduling.out_of_office.created";

        public const string SchedulingOutOfOfficeUpdated = "scheduling.out_of_office.updated";

        public const string SchedulingOutOfOfficeDeleted = "scheduling.out_of_office.deleted";

        public const string SchedulingOutOfOfficeStarted = "scheduling.out_of_office.started";

        public const string SchedulingOutOfOfficeEnded = "scheduling.out_of_office.ended";
    }
}
