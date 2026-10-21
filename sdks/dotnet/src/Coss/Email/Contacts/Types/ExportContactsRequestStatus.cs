using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss.Email;

[JsonConverter(typeof(ExportContactsRequestStatus.ExportContactsRequestStatusSerializer))]
[Serializable]
public readonly record struct ExportContactsRequestStatus : IStringEnum
{
    public static readonly ExportContactsRequestStatus Subscribed = new(Values.Subscribed);

    public static readonly ExportContactsRequestStatus Unsubscribed = new(Values.Unsubscribed);

    public static readonly ExportContactsRequestStatus Pending = new(Values.Pending);

    public ExportContactsRequestStatus(string value)
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
    public static ExportContactsRequestStatus FromCustom(string value)
    {
        return new ExportContactsRequestStatus(value);
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

    public static bool operator ==(ExportContactsRequestStatus value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(ExportContactsRequestStatus value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(ExportContactsRequestStatus value) => value.Value;

    public static explicit operator ExportContactsRequestStatus(string value) => new(value);

    internal class ExportContactsRequestStatusSerializer
        : JsonConverter<ExportContactsRequestStatus>
    {
        public override ExportContactsRequestStatus Read(
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
            return new ExportContactsRequestStatus(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            ExportContactsRequestStatus value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override ExportContactsRequestStatus ReadAsPropertyName(
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
            return new ExportContactsRequestStatus(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            ExportContactsRequestStatus value,
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
