using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(DomainRecordStatus.DomainRecordStatusSerializer))]
[Serializable]
public readonly record struct DomainRecordStatus : IStringEnum
{
    public static readonly DomainRecordStatus Verified = new(Values.Verified);

    public static readonly DomainRecordStatus Missing = new(Values.Missing);

    public static readonly DomainRecordStatus Mismatch = new(Values.Mismatch);

    public static readonly DomainRecordStatus NotChecked = new(Values.NotChecked);

    public DomainRecordStatus(string value)
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
    public static DomainRecordStatus FromCustom(string value)
    {
        return new DomainRecordStatus(value);
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

    public static bool operator ==(DomainRecordStatus value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(DomainRecordStatus value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(DomainRecordStatus value) => value.Value;

    public static explicit operator DomainRecordStatus(string value) => new(value);

    internal class DomainRecordStatusSerializer : JsonConverter<DomainRecordStatus>
    {
        public override DomainRecordStatus Read(
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
            return new DomainRecordStatus(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            DomainRecordStatus value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override DomainRecordStatus ReadAsPropertyName(
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
            return new DomainRecordStatus(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            DomainRecordStatus value,
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
