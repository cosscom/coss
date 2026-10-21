using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(RiskSettingsObject.RiskSettingsObjectSerializer))]
[Serializable]
public readonly record struct RiskSettingsObject : IStringEnum
{
    public static readonly RiskSettingsObject RiskSettings = new(Values.RiskSettings);

    public RiskSettingsObject(string value)
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
    public static RiskSettingsObject FromCustom(string value)
    {
        return new RiskSettingsObject(value);
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

    public static bool operator ==(RiskSettingsObject value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(RiskSettingsObject value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(RiskSettingsObject value) => value.Value;

    public static explicit operator RiskSettingsObject(string value) => new(value);

    internal class RiskSettingsObjectSerializer : JsonConverter<RiskSettingsObject>
    {
        public override RiskSettingsObject Read(
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
            return new RiskSettingsObject(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            RiskSettingsObject value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override RiskSettingsObject ReadAsPropertyName(
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
            return new RiskSettingsObject(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            RiskSettingsObject value,
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
        public const string RiskSettings = "risk_settings";
    }
}
