using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(RiskEvent.RiskEventSerializer))]
[Serializable]
public readonly record struct RiskEvent : IStringEnum
{
    public static readonly RiskEvent Signup = new(Values.Signup);

    public static readonly RiskEvent Login = new(Values.Login);

    public static readonly RiskEvent Message = new(Values.Message);

    public static readonly RiskEvent Checkout = new(Values.Checkout);

    public static readonly RiskEvent Custom = new(Values.Custom);

    public RiskEvent(string value)
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
    public static RiskEvent FromCustom(string value)
    {
        return new RiskEvent(value);
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

    public static bool operator ==(RiskEvent value1, string value2) => value1.Value.Equals(value2);

    public static bool operator !=(RiskEvent value1, string value2) => !value1.Value.Equals(value2);

    public static explicit operator string(RiskEvent value) => value.Value;

    public static explicit operator RiskEvent(string value) => new(value);

    internal class RiskEventSerializer : JsonConverter<RiskEvent>
    {
        public override RiskEvent Read(
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
            return new RiskEvent(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            RiskEvent value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override RiskEvent ReadAsPropertyName(
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
            return new RiskEvent(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            RiskEvent value,
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
        public const string Signup = "signup";

        public const string Login = "login";

        public const string Message = "message";

        public const string Checkout = "checkout";

        public const string Custom = "custom";
    }
}
