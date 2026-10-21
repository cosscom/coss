using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(UsageBillingRequestGroupBy.UsageBillingRequestGroupBySerializer))]
[Serializable]
public readonly record struct UsageBillingRequestGroupBy : IStringEnum
{
    public static readonly UsageBillingRequestGroupBy Environment = new(Values.Environment);

    public UsageBillingRequestGroupBy(string value)
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
    public static UsageBillingRequestGroupBy FromCustom(string value)
    {
        return new UsageBillingRequestGroupBy(value);
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

    public static bool operator ==(UsageBillingRequestGroupBy value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(UsageBillingRequestGroupBy value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(UsageBillingRequestGroupBy value) => value.Value;

    public static explicit operator UsageBillingRequestGroupBy(string value) => new(value);

    internal class UsageBillingRequestGroupBySerializer : JsonConverter<UsageBillingRequestGroupBy>
    {
        public override UsageBillingRequestGroupBy Read(
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
            return new UsageBillingRequestGroupBy(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            UsageBillingRequestGroupBy value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override UsageBillingRequestGroupBy ReadAsPropertyName(
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
            return new UsageBillingRequestGroupBy(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            UsageBillingRequestGroupBy value,
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
        public const string Environment = "environment";
    }
}
