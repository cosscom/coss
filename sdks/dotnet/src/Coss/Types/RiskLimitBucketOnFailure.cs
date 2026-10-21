using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(RiskLimitBucketOnFailure.RiskLimitBucketOnFailureSerializer))]
[Serializable]
public readonly record struct RiskLimitBucketOnFailure : IStringEnum
{
    public static readonly RiskLimitBucketOnFailure Allow = new(Values.Allow);

    public static readonly RiskLimitBucketOnFailure Deny = new(Values.Deny);

    public RiskLimitBucketOnFailure(string value)
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
    public static RiskLimitBucketOnFailure FromCustom(string value)
    {
        return new RiskLimitBucketOnFailure(value);
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

    public static bool operator ==(RiskLimitBucketOnFailure value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(RiskLimitBucketOnFailure value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(RiskLimitBucketOnFailure value) => value.Value;

    public static explicit operator RiskLimitBucketOnFailure(string value) => new(value);

    internal class RiskLimitBucketOnFailureSerializer : JsonConverter<RiskLimitBucketOnFailure>
    {
        public override RiskLimitBucketOnFailure Read(
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
            return new RiskLimitBucketOnFailure(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            RiskLimitBucketOnFailure value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override RiskLimitBucketOnFailure ReadAsPropertyName(
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
            return new RiskLimitBucketOnFailure(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            RiskLimitBucketOnFailure value,
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
        public const string Allow = "allow";

        public const string Deny = "deny";
    }
}
