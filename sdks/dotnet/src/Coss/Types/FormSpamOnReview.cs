using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(FormSpamOnReview.FormSpamOnReviewSerializer))]
[Serializable]
public readonly record struct FormSpamOnReview : IStringEnum
{
    public static readonly FormSpamOnReview Deliver = new(Values.Deliver);

    public static readonly FormSpamOnReview Hold = new(Values.Hold);

    public FormSpamOnReview(string value)
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
    public static FormSpamOnReview FromCustom(string value)
    {
        return new FormSpamOnReview(value);
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

    public static bool operator ==(FormSpamOnReview value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(FormSpamOnReview value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(FormSpamOnReview value) => value.Value;

    public static explicit operator FormSpamOnReview(string value) => new(value);

    internal class FormSpamOnReviewSerializer : JsonConverter<FormSpamOnReview>
    {
        public override FormSpamOnReview Read(
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
            return new FormSpamOnReview(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            FormSpamOnReview value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override FormSpamOnReview ReadAsPropertyName(
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
            return new FormSpamOnReview(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            FormSpamOnReview value,
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
        public const string Deliver = "deliver";

        public const string Hold = "hold";
    }
}
