using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(VerificationStatus.VerificationStatusSerializer))]
[Serializable]
public readonly record struct VerificationStatus : IStringEnum
{
    public static readonly VerificationStatus Pending = new(Values.Pending);

    public static readonly VerificationStatus Approved = new(Values.Approved);

    public static readonly VerificationStatus Expired = new(Values.Expired);

    public static readonly VerificationStatus Canceled = new(Values.Canceled);

    public static readonly VerificationStatus Failed = new(Values.Failed);

    public static readonly VerificationStatus Blocked = new(Values.Blocked);

    public VerificationStatus(string value)
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
    public static VerificationStatus FromCustom(string value)
    {
        return new VerificationStatus(value);
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

    public static bool operator ==(VerificationStatus value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(VerificationStatus value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(VerificationStatus value) => value.Value;

    public static explicit operator VerificationStatus(string value) => new(value);

    internal class VerificationStatusSerializer : JsonConverter<VerificationStatus>
    {
        public override VerificationStatus Read(
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
            return new VerificationStatus(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            VerificationStatus value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override VerificationStatus ReadAsPropertyName(
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
            return new VerificationStatus(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            VerificationStatus value,
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
