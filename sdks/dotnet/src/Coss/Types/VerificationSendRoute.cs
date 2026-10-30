using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(VerificationSendRoute.VerificationSendRouteSerializer))]
[Serializable]
public readonly record struct VerificationSendRoute : IStringEnum
{
    public static readonly VerificationSendRoute OwnNumber = new(Values.OwnNumber);

    public static readonly VerificationSendRoute SharedNumber = new(Values.SharedNumber);

    public static readonly VerificationSendRoute Email = new(Values.Email);

    public static readonly VerificationSendRoute CossEmail = new(Values.CossEmail);

    public VerificationSendRoute(string value)
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
    public static VerificationSendRoute FromCustom(string value)
    {
        return new VerificationSendRoute(value);
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

    public static bool operator ==(VerificationSendRoute value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(VerificationSendRoute value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(VerificationSendRoute value) => value.Value;

    public static explicit operator VerificationSendRoute(string value) => new(value);

    internal class VerificationSendRouteSerializer : JsonConverter<VerificationSendRoute>
    {
        public override VerificationSendRoute Read(
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
            return new VerificationSendRoute(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            VerificationSendRoute value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override VerificationSendRoute ReadAsPropertyName(
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
            return new VerificationSendRoute(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            VerificationSendRoute value,
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
        public const string OwnNumber = "own_number";

        public const string SharedNumber = "shared_number";

        public const string Email = "email";

        public const string CossEmail = "coss_email";
    }
}
