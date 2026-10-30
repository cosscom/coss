using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(ListVerifyRequestStatus.ListVerifyRequestStatusSerializer))]
[Serializable]
public readonly record struct ListVerifyRequestStatus : IStringEnum
{
    public static readonly ListVerifyRequestStatus Pending = new(Values.Pending);

    public static readonly ListVerifyRequestStatus Approved = new(Values.Approved);

    public static readonly ListVerifyRequestStatus Expired = new(Values.Expired);

    public static readonly ListVerifyRequestStatus Canceled = new(Values.Canceled);

    public static readonly ListVerifyRequestStatus Failed = new(Values.Failed);

    public static readonly ListVerifyRequestStatus Blocked = new(Values.Blocked);

    public ListVerifyRequestStatus(string value)
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
    public static ListVerifyRequestStatus FromCustom(string value)
    {
        return new ListVerifyRequestStatus(value);
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

    public static bool operator ==(ListVerifyRequestStatus value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(ListVerifyRequestStatus value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(ListVerifyRequestStatus value) => value.Value;

    public static explicit operator ListVerifyRequestStatus(string value) => new(value);

    internal class ListVerifyRequestStatusSerializer : JsonConverter<ListVerifyRequestStatus>
    {
        public override ListVerifyRequestStatus Read(
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
            return new ListVerifyRequestStatus(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            ListVerifyRequestStatus value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override ListVerifyRequestStatus ReadAsPropertyName(
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
            return new ListVerifyRequestStatus(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            ListVerifyRequestStatus value,
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

        public const string Approved = "approved";

        public const string Expired = "expired";

        public const string Canceled = "canceled";

        public const string Failed = "failed";

        public const string Blocked = "blocked";
    }
}
