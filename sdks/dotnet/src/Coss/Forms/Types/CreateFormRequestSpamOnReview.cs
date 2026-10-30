using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(CreateFormRequestSpamOnReview.CreateFormRequestSpamOnReviewSerializer))]
[Serializable]
public readonly record struct CreateFormRequestSpamOnReview : IStringEnum
{
    public static readonly CreateFormRequestSpamOnReview Deliver = new(Values.Deliver);

    public static readonly CreateFormRequestSpamOnReview Hold = new(Values.Hold);

    public CreateFormRequestSpamOnReview(string value)
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
    public static CreateFormRequestSpamOnReview FromCustom(string value)
    {
        return new CreateFormRequestSpamOnReview(value);
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

    public static bool operator ==(CreateFormRequestSpamOnReview value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(CreateFormRequestSpamOnReview value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(CreateFormRequestSpamOnReview value) => value.Value;

    public static explicit operator CreateFormRequestSpamOnReview(string value) => new(value);

    internal class CreateFormRequestSpamOnReviewSerializer
        : JsonConverter<CreateFormRequestSpamOnReview>
    {
        public override CreateFormRequestSpamOnReview Read(
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
            return new CreateFormRequestSpamOnReview(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            CreateFormRequestSpamOnReview value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override CreateFormRequestSpamOnReview ReadAsPropertyName(
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
            return new CreateFormRequestSpamOnReview(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            CreateFormRequestSpamOnReview value,
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
