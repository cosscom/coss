using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(RiskListEntryObject.RiskListEntryObjectSerializer))]
[Serializable]
public readonly record struct RiskListEntryObject : IStringEnum
{
    public static readonly RiskListEntryObject RiskListEntry = new(Values.RiskListEntry);

    public RiskListEntryObject(string value)
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
    public static RiskListEntryObject FromCustom(string value)
    {
        return new RiskListEntryObject(value);
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

    public static bool operator ==(RiskListEntryObject value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(RiskListEntryObject value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(RiskListEntryObject value) => value.Value;

    public static explicit operator RiskListEntryObject(string value) => new(value);

    internal class RiskListEntryObjectSerializer : JsonConverter<RiskListEntryObject>
    {
        public override RiskListEntryObject Read(
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
            return new RiskListEntryObject(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            RiskListEntryObject value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override RiskListEntryObject ReadAsPropertyName(
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
            return new RiskListEntryObject(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            RiskListEntryObject value,
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
        public const string RiskListEntry = "risk_list_entry";
    }
}
