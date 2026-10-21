using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss.Email;

[JsonConverter(
    typeof(UpdateContactTopicsRequestTopicsItemStatus.UpdateContactTopicsRequestTopicsItemStatusSerializer)
)]
[Serializable]
public readonly record struct UpdateContactTopicsRequestTopicsItemStatus : IStringEnum
{
    public static readonly UpdateContactTopicsRequestTopicsItemStatus OptedIn = new(Values.OptedIn);

    public static readonly UpdateContactTopicsRequestTopicsItemStatus OptedOut = new(
        Values.OptedOut
    );

    public UpdateContactTopicsRequestTopicsItemStatus(string value)
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
    public static UpdateContactTopicsRequestTopicsItemStatus FromCustom(string value)
    {
        return new UpdateContactTopicsRequestTopicsItemStatus(value);
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

    public static bool operator ==(
        UpdateContactTopicsRequestTopicsItemStatus value1,
        string value2
    ) => value1.Value.Equals(value2);

    public static bool operator !=(
        UpdateContactTopicsRequestTopicsItemStatus value1,
        string value2
    ) => !value1.Value.Equals(value2);

    public static explicit operator string(UpdateContactTopicsRequestTopicsItemStatus value) =>
        value.Value;

    public static explicit operator UpdateContactTopicsRequestTopicsItemStatus(string value) =>
        new(value);

    internal class UpdateContactTopicsRequestTopicsItemStatusSerializer
        : JsonConverter<UpdateContactTopicsRequestTopicsItemStatus>
    {
        public override UpdateContactTopicsRequestTopicsItemStatus Read(
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
            return new UpdateContactTopicsRequestTopicsItemStatus(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            UpdateContactTopicsRequestTopicsItemStatus value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override UpdateContactTopicsRequestTopicsItemStatus ReadAsPropertyName(
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
            return new UpdateContactTopicsRequestTopicsItemStatus(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            UpdateContactTopicsRequestTopicsItemStatus value,
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
        public const string OptedIn = "opted_in";

        public const string OptedOut = "opted_out";
    }
}
