using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(DomainDmarcStage.DomainDmarcStageSerializer))]
[Serializable]
public readonly record struct DomainDmarcStage : IStringEnum
{
    public static readonly DomainDmarcStage NotChecked = new(Values.NotChecked);

    public static readonly DomainDmarcStage NoRecord = new(Values.NoRecord);

    public static readonly DomainDmarcStage Monitoring = new(Values.Monitoring);

    public static readonly DomainDmarcStage Quarantine = new(Values.Quarantine);

    public static readonly DomainDmarcStage Reject = new(Values.Reject);

    public DomainDmarcStage(string value)
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
    public static DomainDmarcStage FromCustom(string value)
    {
        return new DomainDmarcStage(value);
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

    public static bool operator ==(DomainDmarcStage value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(DomainDmarcStage value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(DomainDmarcStage value) => value.Value;

    public static explicit operator DomainDmarcStage(string value) => new(value);

    internal class DomainDmarcStageSerializer : JsonConverter<DomainDmarcStage>
    {
        public override DomainDmarcStage Read(
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
            return new DomainDmarcStage(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            DomainDmarcStage value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override DomainDmarcStage ReadAsPropertyName(
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
            return new DomainDmarcStage(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            DomainDmarcStage value,
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
        public const string NotChecked = "not_checked";

        public const string NoRecord = "no_record";

        public const string Monitoring = "monitoring";

        public const string Quarantine = "quarantine";

        public const string Reject = "reject";
    }
}
