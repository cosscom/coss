using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(TrackingDomainStatus.TrackingDomainStatusSerializer))]
[Serializable]
public readonly record struct TrackingDomainStatus : IStringEnum
{
    public static readonly TrackingDomainStatus Pending = new(Values.Pending);

    public static readonly TrackingDomainStatus Active = new(Values.Active);

    public static readonly TrackingDomainStatus TemporaryFailure = new(Values.TemporaryFailure);

    public static readonly TrackingDomainStatus Failed = new(Values.Failed);

    public static readonly TrackingDomainStatus Deleting = new(Values.Deleting);

    public TrackingDomainStatus(string value)
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
    public static TrackingDomainStatus FromCustom(string value)
    {
        return new TrackingDomainStatus(value);
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

    public static bool operator ==(TrackingDomainStatus value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(TrackingDomainStatus value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(TrackingDomainStatus value) => value.Value;

    public static explicit operator TrackingDomainStatus(string value) => new(value);

    internal class TrackingDomainStatusSerializer : JsonConverter<TrackingDomainStatus>
    {
        public override TrackingDomainStatus Read(
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
            return new TrackingDomainStatus(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            TrackingDomainStatus value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override TrackingDomainStatus ReadAsPropertyName(
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
            return new TrackingDomainStatus(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            TrackingDomainStatus value,
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

        public const string Active = "active";

        public const string TemporaryFailure = "temporary_failure";

        public const string Failed = "failed";

        public const string Deleting = "deleting";
    }
}
