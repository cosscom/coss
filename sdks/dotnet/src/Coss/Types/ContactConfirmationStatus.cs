using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(ContactConfirmationStatus.ContactConfirmationStatusSerializer))]
[Serializable]
public readonly record struct ContactConfirmationStatus : IStringEnum
{
    public static readonly ContactConfirmationStatus Sent = new(Values.Sent);

    public static readonly ContactConfirmationStatus Cooldown = new(Values.Cooldown);

    public static readonly ContactConfirmationStatus LimitReached = new(Values.LimitReached);

    public static readonly ContactConfirmationStatus NotPending = new(Values.NotPending);

    public ContactConfirmationStatus(string value)
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
    public static ContactConfirmationStatus FromCustom(string value)
    {
        return new ContactConfirmationStatus(value);
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

    public static bool operator ==(ContactConfirmationStatus value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(ContactConfirmationStatus value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(ContactConfirmationStatus value) => value.Value;

    public static explicit operator ContactConfirmationStatus(string value) => new(value);

    internal class ContactConfirmationStatusSerializer : JsonConverter<ContactConfirmationStatus>
    {
        public override ContactConfirmationStatus Read(
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
            return new ContactConfirmationStatus(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            ContactConfirmationStatus value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override ContactConfirmationStatus ReadAsPropertyName(
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
            return new ContactConfirmationStatus(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            ContactConfirmationStatus value,
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
        public const string Sent = "sent";

        public const string Cooldown = "cooldown";

        public const string LimitReached = "limit_reached";

        public const string NotPending = "not_pending";
    }
}
