using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(SignRequestStatus.SignRequestStatusSerializer))]
[Serializable]
public readonly record struct SignRequestStatus : IStringEnum
{
    public static readonly SignRequestStatus Draft = new(Values.Draft);

    public static readonly SignRequestStatus Sent = new(Values.Sent);

    public static readonly SignRequestStatus Completed = new(Values.Completed);

    public static readonly SignRequestStatus Declined = new(Values.Declined);

    public static readonly SignRequestStatus Canceled = new(Values.Canceled);

    public static readonly SignRequestStatus Expired = new(Values.Expired);

    public SignRequestStatus(string value)
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
    public static SignRequestStatus FromCustom(string value)
    {
        return new SignRequestStatus(value);
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

    public static bool operator ==(SignRequestStatus value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(SignRequestStatus value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(SignRequestStatus value) => value.Value;

    public static explicit operator SignRequestStatus(string value) => new(value);

    internal class SignRequestStatusSerializer : JsonConverter<SignRequestStatus>
    {
        public override SignRequestStatus Read(
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
            return new SignRequestStatus(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            SignRequestStatus value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override SignRequestStatus ReadAsPropertyName(
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
            return new SignRequestStatus(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            SignRequestStatus value,
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
        public const string Draft = "draft";

        public const string Sent = "sent";

        public const string Completed = "completed";

        public const string Declined = "declined";

        public const string Canceled = "canceled";

        public const string Expired = "expired";
    }
}
