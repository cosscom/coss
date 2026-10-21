using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss.Risk;

[JsonConverter(
    typeof(ListAssessmentsRequestReviewStatus.ListAssessmentsRequestReviewStatusSerializer)
)]
[Serializable]
public readonly record struct ListAssessmentsRequestReviewStatus : IStringEnum
{
    public static readonly ListAssessmentsRequestReviewStatus Open = new(Values.Open);

    public static readonly ListAssessmentsRequestReviewStatus Resolved = new(Values.Resolved);

    public ListAssessmentsRequestReviewStatus(string value)
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
    public static ListAssessmentsRequestReviewStatus FromCustom(string value)
    {
        return new ListAssessmentsRequestReviewStatus(value);
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

    public static bool operator ==(ListAssessmentsRequestReviewStatus value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(ListAssessmentsRequestReviewStatus value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(ListAssessmentsRequestReviewStatus value) => value.Value;

    public static explicit operator ListAssessmentsRequestReviewStatus(string value) => new(value);

    internal class ListAssessmentsRequestReviewStatusSerializer
        : JsonConverter<ListAssessmentsRequestReviewStatus>
    {
        public override ListAssessmentsRequestReviewStatus Read(
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
            return new ListAssessmentsRequestReviewStatus(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            ListAssessmentsRequestReviewStatus value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override ListAssessmentsRequestReviewStatus ReadAsPropertyName(
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
            return new ListAssessmentsRequestReviewStatus(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            ListAssessmentsRequestReviewStatus value,
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
        public const string Open = "open";

        public const string Resolved = "resolved";
    }
}
