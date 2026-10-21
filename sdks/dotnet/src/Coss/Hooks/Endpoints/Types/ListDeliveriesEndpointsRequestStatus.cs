using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss.Hooks;

[JsonConverter(
    typeof(ListDeliveriesEndpointsRequestStatus.ListDeliveriesEndpointsRequestStatusSerializer)
)]
[Serializable]
public readonly record struct ListDeliveriesEndpointsRequestStatus : IStringEnum
{
    public static readonly ListDeliveriesEndpointsRequestStatus Pending = new(Values.Pending);

    public static readonly ListDeliveriesEndpointsRequestStatus Succeeded = new(Values.Succeeded);

    public static readonly ListDeliveriesEndpointsRequestStatus Failed = new(Values.Failed);

    public ListDeliveriesEndpointsRequestStatus(string value)
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
    public static ListDeliveriesEndpointsRequestStatus FromCustom(string value)
    {
        return new ListDeliveriesEndpointsRequestStatus(value);
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

    public static bool operator ==(ListDeliveriesEndpointsRequestStatus value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(ListDeliveriesEndpointsRequestStatus value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(ListDeliveriesEndpointsRequestStatus value) =>
        value.Value;

    public static explicit operator ListDeliveriesEndpointsRequestStatus(string value) =>
        new(value);

    internal class ListDeliveriesEndpointsRequestStatusSerializer
        : JsonConverter<ListDeliveriesEndpointsRequestStatus>
    {
        public override ListDeliveriesEndpointsRequestStatus Read(
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
            return new ListDeliveriesEndpointsRequestStatus(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            ListDeliveriesEndpointsRequestStatus value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override ListDeliveriesEndpointsRequestStatus ReadAsPropertyName(
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
            return new ListDeliveriesEndpointsRequestStatus(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            ListDeliveriesEndpointsRequestStatus value,
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
