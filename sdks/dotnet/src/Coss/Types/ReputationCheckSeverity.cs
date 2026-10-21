using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(ReputationCheckSeverity.ReputationCheckSeveritySerializer))]
[Serializable]
public readonly record struct ReputationCheckSeverity : IStringEnum
{
    public static readonly ReputationCheckSeverity Ok = new(Values.Ok);

    public static readonly ReputationCheckSeverity Warning = new(Values.Warning);

    public static readonly ReputationCheckSeverity Suspend = new(Values.Suspend);

    public ReputationCheckSeverity(string value)
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
    public static ReputationCheckSeverity FromCustom(string value)
    {
        return new ReputationCheckSeverity(value);
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

    public static bool operator ==(ReputationCheckSeverity value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(ReputationCheckSeverity value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(ReputationCheckSeverity value) => value.Value;

    public static explicit operator ReputationCheckSeverity(string value) => new(value);

    internal class ReputationCheckSeveritySerializer : JsonConverter<ReputationCheckSeverity>
    {
        public override ReputationCheckSeverity Read(
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
            return new ReputationCheckSeverity(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            ReputationCheckSeverity value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override ReputationCheckSeverity ReadAsPropertyName(
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
            return new ReputationCheckSeverity(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            ReputationCheckSeverity value,
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
        public const string Ok = "ok";

        public const string Warning = "warning";

        public const string Suspend = "suspend";
    }
}
