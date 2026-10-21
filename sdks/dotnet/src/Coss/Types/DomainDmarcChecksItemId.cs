using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(DomainDmarcChecksItemId.DomainDmarcChecksItemIdSerializer))]
[Serializable]
public readonly record struct DomainDmarcChecksItemId : IStringEnum
{
    public static readonly DomainDmarcChecksItemId Coverage = new(Values.Coverage);

    public static readonly DomainDmarcChecksItemId Recent = new(Values.Recent);

    public static readonly DomainDmarcChecksItemId Complete = new(Values.Complete);

    public static readonly DomainDmarcChecksItemId TimeAtPolicy = new(Values.TimeAtPolicy);

    public static readonly DomainDmarcChecksItemId CossPassRate = new(Values.CossPassRate);

    public static readonly DomainDmarcChecksItemId PassRate = new(Values.PassRate);

    public static readonly DomainDmarcChecksItemId Sources = new(Values.Sources);

    public DomainDmarcChecksItemId(string value)
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
    public static DomainDmarcChecksItemId FromCustom(string value)
    {
        return new DomainDmarcChecksItemId(value);
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

    public static bool operator ==(DomainDmarcChecksItemId value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(DomainDmarcChecksItemId value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(DomainDmarcChecksItemId value) => value.Value;

    public static explicit operator DomainDmarcChecksItemId(string value) => new(value);

    internal class DomainDmarcChecksItemIdSerializer : JsonConverter<DomainDmarcChecksItemId>
    {
        public override DomainDmarcChecksItemId Read(
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
            return new DomainDmarcChecksItemId(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            DomainDmarcChecksItemId value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override DomainDmarcChecksItemId ReadAsPropertyName(
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
            return new DomainDmarcChecksItemId(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            DomainDmarcChecksItemId value,
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
        public const string Coverage = "coverage";

        public const string Recent = "recent";

        public const string Complete = "complete";

        public const string TimeAtPolicy = "time_at_policy";

        public const string CossPassRate = "coss_pass_rate";

        public const string PassRate = "pass_rate";

        public const string Sources = "sources";
    }
}
