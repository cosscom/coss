using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss.Risk;

[JsonConverter(
    typeof(UpdateRiskLimitBucketRequestOnFailure.UpdateRiskLimitBucketRequestOnFailureSerializer)
)]
[Serializable]
public readonly record struct UpdateRiskLimitBucketRequestOnFailure : IStringEnum
{
    public static readonly UpdateRiskLimitBucketRequestOnFailure Allow = new(Values.Allow);

    public static readonly UpdateRiskLimitBucketRequestOnFailure Deny = new(Values.Deny);

    public UpdateRiskLimitBucketRequestOnFailure(string value)
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
    public static UpdateRiskLimitBucketRequestOnFailure FromCustom(string value)
    {
        return new UpdateRiskLimitBucketRequestOnFailure(value);
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

    public static bool operator ==(UpdateRiskLimitBucketRequestOnFailure value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(UpdateRiskLimitBucketRequestOnFailure value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(UpdateRiskLimitBucketRequestOnFailure value) =>
        value.Value;

    public static explicit operator UpdateRiskLimitBucketRequestOnFailure(string value) =>
        new(value);

    internal class UpdateRiskLimitBucketRequestOnFailureSerializer
        : JsonConverter<UpdateRiskLimitBucketRequestOnFailure>
    {
        public override UpdateRiskLimitBucketRequestOnFailure Read(
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
            return new UpdateRiskLimitBucketRequestOnFailure(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            UpdateRiskLimitBucketRequestOnFailure value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override UpdateRiskLimitBucketRequestOnFailure ReadAsPropertyName(
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
            return new UpdateRiskLimitBucketRequestOnFailure(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            UpdateRiskLimitBucketRequestOnFailure value,
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
