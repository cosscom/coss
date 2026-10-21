using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss.Email;

[JsonConverter(typeof(UpsertContactRequestStatus.UpsertContactRequestStatusSerializer))]
[Serializable]
public readonly record struct UpsertContactRequestStatus : IStringEnum
{
    public static readonly UpsertContactRequestStatus Subscribed = new(Values.Subscribed);

    public static readonly UpsertContactRequestStatus Unsubscribed = new(Values.Unsubscribed);

    public UpsertContactRequestStatus(string value)
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
    public static UpsertContactRequestStatus FromCustom(string value)
    {
        return new UpsertContactRequestStatus(value);
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

    public static bool operator ==(UpsertContactRequestStatus value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(UpsertContactRequestStatus value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(UpsertContactRequestStatus value) => value.Value;

    public static explicit operator UpsertContactRequestStatus(string value) => new(value);

    internal class UpsertContactRequestStatusSerializer : JsonConverter<UpsertContactRequestStatus>
    {
        public override UpsertContactRequestStatus Read(
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
            return new UpsertContactRequestStatus(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            UpsertContactRequestStatus value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override UpsertContactRequestStatus ReadAsPropertyName(
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
            return new UpsertContactRequestStatus(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            UpsertContactRequestStatus value,
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
    }
}
