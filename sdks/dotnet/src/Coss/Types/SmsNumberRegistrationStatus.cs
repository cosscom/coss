using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(SmsNumberRegistrationStatus.SmsNumberRegistrationStatusSerializer))]
[Serializable]
public readonly record struct SmsNumberRegistrationStatus : IStringEnum
{
    public static readonly SmsNumberRegistrationStatus Draft = new(Values.Draft);

    public static readonly SmsNumberRegistrationStatus Submitted = new(Values.Submitted);

    public static readonly SmsNumberRegistrationStatus InReview = new(Values.InReview);

    public static readonly SmsNumberRegistrationStatus Approved = new(Values.Approved);

    public static readonly SmsNumberRegistrationStatus Rejected = new(Values.Rejected);

    public static readonly SmsNumberRegistrationStatus Failed = new(Values.Failed);

    public SmsNumberRegistrationStatus(string value)
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
    public static SmsNumberRegistrationStatus FromCustom(string value)
    {
        return new SmsNumberRegistrationStatus(value);
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

    public static bool operator ==(SmsNumberRegistrationStatus value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(SmsNumberRegistrationStatus value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(SmsNumberRegistrationStatus value) => value.Value;

    public static explicit operator SmsNumberRegistrationStatus(string value) => new(value);

    internal class SmsNumberRegistrationStatusSerializer
        : JsonConverter<SmsNumberRegistrationStatus>
    {
        public override SmsNumberRegistrationStatus Read(
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
            return new SmsNumberRegistrationStatus(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            SmsNumberRegistrationStatus value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override SmsNumberRegistrationStatus ReadAsPropertyName(
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
            return new SmsNumberRegistrationStatus(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            SmsNumberRegistrationStatus value,
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

        public const string Submitted = "submitted";

        public const string InReview = "in_review";

        public const string Approved = "approved";

        public const string Rejected = "rejected";

        public const string Failed = "failed";
    }
}
