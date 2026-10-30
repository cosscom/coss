using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(SignEventType.SignEventTypeSerializer))]
[Serializable]
public readonly record struct SignEventType : IStringEnum
{
    public static readonly SignEventType Created = new(Values.Created);

    public static readonly SignEventType Sent = new(Values.Sent);

    public static readonly SignEventType Notified = new(Values.Notified);

    public static readonly SignEventType Viewed = new(Values.Viewed);

    public static readonly SignEventType Consented = new(Values.Consented);

    public static readonly SignEventType Signed = new(Values.Signed);

    public static readonly SignEventType Declined = new(Values.Declined);

    public static readonly SignEventType Reminded = new(Values.Reminded);

    public static readonly SignEventType Canceled = new(Values.Canceled);

    public static readonly SignEventType Expired = new(Values.Expired);

    public static readonly SignEventType Completed = new(Values.Completed);

    public static readonly SignEventType Sealed = new(Values.Sealed);

    public SignEventType(string value)
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
    public static SignEventType FromCustom(string value)
    {
        return new SignEventType(value);
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

    public static bool operator ==(SignEventType value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(SignEventType value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(SignEventType value) => value.Value;

    public static explicit operator SignEventType(string value) => new(value);

    internal class SignEventTypeSerializer : JsonConverter<SignEventType>
    {
        public override SignEventType Read(
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
            return new SignEventType(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            SignEventType value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override SignEventType ReadAsPropertyName(
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
            return new SignEventType(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            SignEventType value,
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
        public const string Created = "created";

        public const string Sent = "sent";

        public const string Notified = "notified";

        public const string Viewed = "viewed";

        public const string Consented = "consented";

        public const string Signed = "signed";

        public const string Declined = "declined";

        public const string Reminded = "reminded";

        public const string Canceled = "canceled";

        public const string Expired = "expired";

        public const string Completed = "completed";

        public const string Sealed = "sealed";
    }
}
