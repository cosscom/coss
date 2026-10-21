using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(ReputationStatus.ReputationStatusSerializer))]
[Serializable]
public readonly record struct ReputationStatus : IStringEnum
{
    public static readonly ReputationStatus Good = new(Values.Good);

    public static readonly ReputationStatus Warning = new(Values.Warning);

    public static readonly ReputationStatus Suspended = new(Values.Suspended);

    public ReputationStatus(string value)
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
    public static ReputationStatus FromCustom(string value)
    {
        return new ReputationStatus(value);
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

    public static bool operator ==(ReputationStatus value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(ReputationStatus value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(ReputationStatus value) => value.Value;

    public static explicit operator ReputationStatus(string value) => new(value);

    internal class ReputationStatusSerializer : JsonConverter<ReputationStatus>
    {
        public override ReputationStatus Read(
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
            return new ReputationStatus(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            ReputationStatus value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override ReputationStatus ReadAsPropertyName(
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
            return new ReputationStatus(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            ReputationStatus value,
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
        public const string Good = "good";

        public const string Warning = "warning";

        public const string Suspended = "suspended";
    }
}
