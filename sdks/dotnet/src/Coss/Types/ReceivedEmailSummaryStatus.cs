using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(ReceivedEmailSummaryStatus.ReceivedEmailSummaryStatusSerializer))]
[Serializable]
public readonly record struct ReceivedEmailSummaryStatus : IStringEnum
{
    public static readonly ReceivedEmailSummaryStatus Received = new(Values.Received);

    public static readonly ReceivedEmailSummaryStatus Blocked = new(Values.Blocked);

    public ReceivedEmailSummaryStatus(string value)
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
    public static ReceivedEmailSummaryStatus FromCustom(string value)
    {
        return new ReceivedEmailSummaryStatus(value);
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

    public static bool operator ==(ReceivedEmailSummaryStatus value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(ReceivedEmailSummaryStatus value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(ReceivedEmailSummaryStatus value) => value.Value;

    public static explicit operator ReceivedEmailSummaryStatus(string value) => new(value);

    internal class ReceivedEmailSummaryStatusSerializer : JsonConverter<ReceivedEmailSummaryStatus>
    {
        public override ReceivedEmailSummaryStatus Read(
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
            return new ReceivedEmailSummaryStatus(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            ReceivedEmailSummaryStatus value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override ReceivedEmailSummaryStatus ReadAsPropertyName(
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
            return new ReceivedEmailSummaryStatus(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            ReceivedEmailSummaryStatus value,
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
        public const string Received = "received";

        public const string Blocked = "blocked";
    }
}
