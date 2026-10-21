using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss.WebhookEndpoints;

[JsonConverter(typeof(ListDeliveriesRequestStatus.ListDeliveriesRequestStatusSerializer))]
[Serializable]
public readonly record struct ListDeliveriesRequestStatus : IStringEnum
{
    public static readonly ListDeliveriesRequestStatus Pending = new(Values.Pending);

    public static readonly ListDeliveriesRequestStatus Succeeded = new(Values.Succeeded);

    public static readonly ListDeliveriesRequestStatus Failed = new(Values.Failed);

    public ListDeliveriesRequestStatus(string value)
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
    public static ListDeliveriesRequestStatus FromCustom(string value)
    {
        return new ListDeliveriesRequestStatus(value);
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

    public static bool operator ==(ListDeliveriesRequestStatus value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(ListDeliveriesRequestStatus value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(ListDeliveriesRequestStatus value) => value.Value;

    public static explicit operator ListDeliveriesRequestStatus(string value) => new(value);

    internal class ListDeliveriesRequestStatusSerializer
        : JsonConverter<ListDeliveriesRequestStatus>
    {
        public override ListDeliveriesRequestStatus Read(
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
            return new ListDeliveriesRequestStatus(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            ListDeliveriesRequestStatus value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override ListDeliveriesRequestStatus ReadAsPropertyName(
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
            return new ListDeliveriesRequestStatus(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            ListDeliveriesRequestStatus value,
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
        public const string Pending = "pending";

        public const string Succeeded = "succeeded";

        public const string Failed = "failed";
    }
}
