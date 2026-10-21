using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(DomainStatus.DomainStatusSerializer))]
[Serializable]
public readonly record struct DomainStatus : IStringEnum
{
    public static readonly DomainStatus Pending = new(Values.Pending);

    public static readonly DomainStatus Verified = new(Values.Verified);

    public static readonly DomainStatus TemporaryFailure = new(Values.TemporaryFailure);

    public static readonly DomainStatus Failed = new(Values.Failed);

    public static readonly DomainStatus Deleting = new(Values.Deleting);

    public DomainStatus(string value)
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
    public static DomainStatus FromCustom(string value)
    {
        return new DomainStatus(value);
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

    public static bool operator ==(DomainStatus value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(DomainStatus value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(DomainStatus value) => value.Value;

    public static explicit operator DomainStatus(string value) => new(value);

    internal class DomainStatusSerializer : JsonConverter<DomainStatus>
    {
        public override DomainStatus Read(
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
            return new DomainStatus(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            DomainStatus value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override DomainStatus ReadAsPropertyName(
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
            return new DomainStatus(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            DomainStatus value,
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

        public const string Verified = "verified";

        public const string TemporaryFailure = "temporary_failure";

        public const string Failed = "failed";

        public const string Deleting = "deleting";
    }
}
