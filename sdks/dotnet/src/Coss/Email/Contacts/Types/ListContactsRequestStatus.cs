using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss.Email;

[JsonConverter(typeof(ListContactsRequestStatus.ListContactsRequestStatusSerializer))]
[Serializable]
public readonly record struct ListContactsRequestStatus : IStringEnum
{
    public static readonly ListContactsRequestStatus Subscribed = new(Values.Subscribed);

    public static readonly ListContactsRequestStatus Unsubscribed = new(Values.Unsubscribed);

    public static readonly ListContactsRequestStatus Pending = new(Values.Pending);

    public ListContactsRequestStatus(string value)
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
    public static ListContactsRequestStatus FromCustom(string value)
    {
        return new ListContactsRequestStatus(value);
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

    public static bool operator ==(ListContactsRequestStatus value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(ListContactsRequestStatus value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(ListContactsRequestStatus value) => value.Value;

    public static explicit operator ListContactsRequestStatus(string value) => new(value);

    internal class ListContactsRequestStatusSerializer : JsonConverter<ListContactsRequestStatus>
    {
        public override ListContactsRequestStatus Read(
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
            return new ListContactsRequestStatus(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            ListContactsRequestStatus value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override ListContactsRequestStatus ReadAsPropertyName(
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
            return new ListContactsRequestStatus(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            ListContactsRequestStatus value,
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
        public const string Subscribed = "subscribed";

        public const string Unsubscribed = "unsubscribed";

        public const string Pending = "pending";
    }
}
