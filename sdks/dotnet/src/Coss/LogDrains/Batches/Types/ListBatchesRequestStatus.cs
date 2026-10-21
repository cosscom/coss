using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss.LogDrains;

[JsonConverter(typeof(ListBatchesRequestStatus.ListBatchesRequestStatusSerializer))]
[Serializable]
public readonly record struct ListBatchesRequestStatus : IStringEnum
{
    public static readonly ListBatchesRequestStatus Pending = new(Values.Pending);

    public static readonly ListBatchesRequestStatus Succeeded = new(Values.Succeeded);

    public static readonly ListBatchesRequestStatus Failed = new(Values.Failed);

    public ListBatchesRequestStatus(string value)
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
    public static ListBatchesRequestStatus FromCustom(string value)
    {
        return new ListBatchesRequestStatus(value);
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

    public static bool operator ==(ListBatchesRequestStatus value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(ListBatchesRequestStatus value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(ListBatchesRequestStatus value) => value.Value;

    public static explicit operator ListBatchesRequestStatus(string value) => new(value);

    internal class ListBatchesRequestStatusSerializer : JsonConverter<ListBatchesRequestStatus>
    {
        public override ListBatchesRequestStatus Read(
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
            return new ListBatchesRequestStatus(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            ListBatchesRequestStatus value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override ListBatchesRequestStatus ReadAsPropertyName(
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
            return new ListBatchesRequestStatus(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            ListBatchesRequestStatus value,
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
