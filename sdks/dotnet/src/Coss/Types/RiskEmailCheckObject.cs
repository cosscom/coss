using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(RiskEmailCheckObject.RiskEmailCheckObjectSerializer))]
[Serializable]
public readonly record struct RiskEmailCheckObject : IStringEnum
{
    public static readonly RiskEmailCheckObject RiskEmailCheck = new(Values.RiskEmailCheck);

    public RiskEmailCheckObject(string value)
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
    public static RiskEmailCheckObject FromCustom(string value)
    {
        return new RiskEmailCheckObject(value);
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

    public static bool operator ==(RiskEmailCheckObject value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(RiskEmailCheckObject value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(RiskEmailCheckObject value) => value.Value;

    public static explicit operator RiskEmailCheckObject(string value) => new(value);

    internal class RiskEmailCheckObjectSerializer : JsonConverter<RiskEmailCheckObject>
    {
        public override RiskEmailCheckObject Read(
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
            return new RiskEmailCheckObject(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            RiskEmailCheckObject value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override RiskEmailCheckObject ReadAsPropertyName(
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
            return new RiskEmailCheckObject(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            RiskEmailCheckObject value,
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
        public const string RiskEmailCheck = "risk_email_check";
    }
}
