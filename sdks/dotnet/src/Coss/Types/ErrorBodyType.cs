using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(ErrorBodyType.ErrorBodyTypeSerializer))]
[Serializable]
public readonly record struct ErrorBodyType : IStringEnum
{
    public static readonly ErrorBodyType InvalidRequestError = new(Values.InvalidRequestError);

    public static readonly ErrorBodyType AuthenticationError = new(Values.AuthenticationError);

    public static readonly ErrorBodyType PermissionError = new(Values.PermissionError);

    public static readonly ErrorBodyType NotFoundError = new(Values.NotFoundError);

    public static readonly ErrorBodyType IdempotencyError = new(Values.IdempotencyError);

    public static readonly ErrorBodyType RateLimitError = new(Values.RateLimitError);

    public static readonly ErrorBodyType BillingError = new(Values.BillingError);

    public static readonly ErrorBodyType ApiError = new(Values.ApiError);

    public ErrorBodyType(string value)
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
    public static ErrorBodyType FromCustom(string value)
    {
        return new ErrorBodyType(value);
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

    public static bool operator ==(ErrorBodyType value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(ErrorBodyType value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(ErrorBodyType value) => value.Value;

    public static explicit operator ErrorBodyType(string value) => new(value);

    internal class ErrorBodyTypeSerializer : JsonConverter<ErrorBodyType>
    {
        public override ErrorBodyType Read(
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
            return new ErrorBodyType(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            ErrorBodyType value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override ErrorBodyType ReadAsPropertyName(
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
            return new ErrorBodyType(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            ErrorBodyType value,
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
        public const string InvalidRequestError = "invalid_request_error";

        public const string AuthenticationError = "authentication_error";

        public const string PermissionError = "permission_error";

        public const string NotFoundError = "not_found_error";

        public const string IdempotencyError = "idempotency_error";

        public const string RateLimitError = "rate_limit_error";

        public const string BillingError = "billing_error";

        public const string ApiError = "api_error";
    }
}
