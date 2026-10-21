using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(DeletedRiskLimitBucketObject.DeletedRiskLimitBucketObjectSerializer))]
[Serializable]
public readonly record struct DeletedRiskLimitBucketObject : IStringEnum
{
    public static readonly DeletedRiskLimitBucketObject RiskLimitBucket = new(
        Values.RiskLimitBucket
    );

    public DeletedRiskLimitBucketObject(string value)
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
    public static DeletedRiskLimitBucketObject FromCustom(string value)
    {
        return new DeletedRiskLimitBucketObject(value);
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

    public static bool operator ==(DeletedRiskLimitBucketObject value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(DeletedRiskLimitBucketObject value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(DeletedRiskLimitBucketObject value) => value.Value;

    public static explicit operator DeletedRiskLimitBucketObject(string value) => new(value);

    internal class DeletedRiskLimitBucketObjectSerializer
        : JsonConverter<DeletedRiskLimitBucketObject>
    {
        public override DeletedRiskLimitBucketObject Read(
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
            return new DeletedRiskLimitBucketObject(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            DeletedRiskLimitBucketObject value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override DeletedRiskLimitBucketObject ReadAsPropertyName(
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
            return new DeletedRiskLimitBucketObject(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            DeletedRiskLimitBucketObject value,
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
        public const string RiskLimitBucket = "risk_limit_bucket";
    }
}
