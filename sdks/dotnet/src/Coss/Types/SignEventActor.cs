using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(SignEventActor.SignEventActorSerializer))]
[Serializable]
public readonly record struct SignEventActor : IStringEnum
{
    public static readonly SignEventActor ApiKey = new(Values.ApiKey);

    public static readonly SignEventActor Signer = new(Values.Signer);

    public static readonly SignEventActor Dashboard = new(Values.Dashboard);

    public static readonly SignEventActor System = new(Values.System);

    public SignEventActor(string value)
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
    public static SignEventActor FromCustom(string value)
    {
        return new SignEventActor(value);
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

    public static bool operator ==(SignEventActor value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(SignEventActor value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(SignEventActor value) => value.Value;

    public static explicit operator SignEventActor(string value) => new(value);

    internal class SignEventActorSerializer : JsonConverter<SignEventActor>
    {
        public override SignEventActor Read(
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
            return new SignEventActor(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            SignEventActor value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override SignEventActor ReadAsPropertyName(
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
            return new SignEventActor(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            SignEventActor value,
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
        public const string ApiKey = "api_key";

        public const string Signer = "signer";

        public const string Dashboard = "dashboard";

        public const string System = "system";
    }
}
