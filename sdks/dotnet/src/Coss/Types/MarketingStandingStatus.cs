using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(MarketingStandingStatus.MarketingStandingStatusSerializer))]
[Serializable]
public readonly record struct MarketingStandingStatus : IStringEnum
{
    public static readonly MarketingStandingStatus Active = new(Values.Active);

    public static readonly MarketingStandingStatus Paused = new(Values.Paused);

    public MarketingStandingStatus(string value)
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
    public static MarketingStandingStatus FromCustom(string value)
    {
        return new MarketingStandingStatus(value);
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

    public static bool operator ==(MarketingStandingStatus value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(MarketingStandingStatus value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(MarketingStandingStatus value) => value.Value;

    public static explicit operator MarketingStandingStatus(string value) => new(value);

    internal class MarketingStandingStatusSerializer : JsonConverter<MarketingStandingStatus>
    {
        public override MarketingStandingStatus Read(
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
            return new MarketingStandingStatus(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            MarketingStandingStatus value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override MarketingStandingStatus ReadAsPropertyName(
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
            return new MarketingStandingStatus(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            MarketingStandingStatus value,
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
        public const string Active = "active";

        public const string Paused = "paused";
    }
}
