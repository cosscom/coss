using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(DomainDmarcNextKind.DomainDmarcNextKindSerializer))]
[Serializable]
public readonly record struct DomainDmarcNextKind : IStringEnum
{
    public static readonly DomainDmarcNextKind Publish = new(Values.Publish);

    public static readonly DomainDmarcNextKind AddReporting = new(Values.AddReporting);

    public static readonly DomainDmarcNextKind CompleteRollout = new(Values.CompleteRollout);

    public static readonly DomainDmarcNextKind Tighten = new(Values.Tighten);

    public DomainDmarcNextKind(string value)
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
    public static DomainDmarcNextKind FromCustom(string value)
    {
        return new DomainDmarcNextKind(value);
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

    public static bool operator ==(DomainDmarcNextKind value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(DomainDmarcNextKind value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(DomainDmarcNextKind value) => value.Value;

    public static explicit operator DomainDmarcNextKind(string value) => new(value);

    internal class DomainDmarcNextKindSerializer : JsonConverter<DomainDmarcNextKind>
    {
        public override DomainDmarcNextKind Read(
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
            return new DomainDmarcNextKind(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            DomainDmarcNextKind value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override DomainDmarcNextKind ReadAsPropertyName(
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
            return new DomainDmarcNextKind(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            DomainDmarcNextKind value,
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
        public const string Publish = "publish";

        public const string AddReporting = "add_reporting";

        public const string CompleteRollout = "complete_rollout";

        public const string Tighten = "tighten";
    }
}
