using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(RiskListEntryListObject.RiskListEntryListObjectSerializer))]
[Serializable]
public readonly record struct RiskListEntryListObject : IStringEnum
{
    public static readonly RiskListEntryListObject List = new(Values.List);

    public RiskListEntryListObject(string value)
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
    public static RiskListEntryListObject FromCustom(string value)
    {
        return new RiskListEntryListObject(value);
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

    public static bool operator ==(RiskListEntryListObject value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(RiskListEntryListObject value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(RiskListEntryListObject value) => value.Value;

    public static explicit operator RiskListEntryListObject(string value) => new(value);

    internal class RiskListEntryListObjectSerializer : JsonConverter<RiskListEntryListObject>
    {
        public override RiskListEntryListObject Read(
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
            return new RiskListEntryListObject(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            RiskListEntryListObject value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override RiskListEntryListObject ReadAsPropertyName(
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
            return new RiskListEntryListObject(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            RiskListEntryListObject value,
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
        public const string List = "list";
    }
}
