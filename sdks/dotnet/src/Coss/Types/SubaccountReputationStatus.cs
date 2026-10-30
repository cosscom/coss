using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(SubaccountReputationStatus.SubaccountReputationStatusSerializer))]
[Serializable]
public readonly record struct SubaccountReputationStatus : IStringEnum
{
    public static readonly SubaccountReputationStatus Good = new(Values.Good);

    public static readonly SubaccountReputationStatus Warning = new(Values.Warning);

    public static readonly SubaccountReputationStatus Paused = new(Values.Paused);

    public SubaccountReputationStatus(string value)
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
    public static SubaccountReputationStatus FromCustom(string value)
    {
        return new SubaccountReputationStatus(value);
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

    public static bool operator ==(SubaccountReputationStatus value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(SubaccountReputationStatus value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(SubaccountReputationStatus value) => value.Value;

    public static explicit operator SubaccountReputationStatus(string value) => new(value);

    internal class SubaccountReputationStatusSerializer : JsonConverter<SubaccountReputationStatus>
    {
        public override SubaccountReputationStatus Read(
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
            return new SubaccountReputationStatus(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            SubaccountReputationStatus value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override SubaccountReputationStatus ReadAsPropertyName(
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
            return new SubaccountReputationStatus(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            SubaccountReputationStatus value,
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

        public const string Paused = "paused";
    }
}
