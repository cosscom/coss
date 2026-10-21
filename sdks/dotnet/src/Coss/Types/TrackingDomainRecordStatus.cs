using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(TrackingDomainRecordStatus.TrackingDomainRecordStatusSerializer))]
[Serializable]
public readonly record struct TrackingDomainRecordStatus : IStringEnum
{
    public static readonly TrackingDomainRecordStatus Verified = new(Values.Verified);

    public static readonly TrackingDomainRecordStatus Missing = new(Values.Missing);

    public static readonly TrackingDomainRecordStatus Mismatch = new(Values.Mismatch);

    public static readonly TrackingDomainRecordStatus NotChecked = new(Values.NotChecked);

    public TrackingDomainRecordStatus(string value)
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
    public static TrackingDomainRecordStatus FromCustom(string value)
    {
        return new TrackingDomainRecordStatus(value);
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

    public static bool operator ==(TrackingDomainRecordStatus value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(TrackingDomainRecordStatus value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(TrackingDomainRecordStatus value) => value.Value;

    public static explicit operator TrackingDomainRecordStatus(string value) => new(value);

    internal class TrackingDomainRecordStatusSerializer : JsonConverter<TrackingDomainRecordStatus>
    {
        public override TrackingDomainRecordStatus Read(
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
            return new TrackingDomainRecordStatus(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            TrackingDomainRecordStatus value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override TrackingDomainRecordStatus ReadAsPropertyName(
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
            return new TrackingDomainRecordStatus(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            TrackingDomainRecordStatus value,
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
        public const string Verified = "verified";

        public const string Missing = "missing";

        public const string Mismatch = "mismatch";

        public const string NotChecked = "not_checked";
    }
}
