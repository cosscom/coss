using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss.Email;

[JsonConverter(
    typeof(UpdateContactRequestTopicsItemStatus.UpdateContactRequestTopicsItemStatusSerializer)
)]
[Serializable]
public readonly record struct UpdateContactRequestTopicsItemStatus : IStringEnum
{
    public static readonly UpdateContactRequestTopicsItemStatus OptedIn = new(Values.OptedIn);

    public static readonly UpdateContactRequestTopicsItemStatus OptedOut = new(Values.OptedOut);

    public UpdateContactRequestTopicsItemStatus(string value)
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
    public static UpdateContactRequestTopicsItemStatus FromCustom(string value)
    {
        return new UpdateContactRequestTopicsItemStatus(value);
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

    public static bool operator ==(UpdateContactRequestTopicsItemStatus value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(UpdateContactRequestTopicsItemStatus value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(UpdateContactRequestTopicsItemStatus value) =>
        value.Value;

    public static explicit operator UpdateContactRequestTopicsItemStatus(string value) =>
        new(value);

    internal class UpdateContactRequestTopicsItemStatusSerializer
        : JsonConverter<UpdateContactRequestTopicsItemStatus>
    {
        public override UpdateContactRequestTopicsItemStatus Read(
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
            return new UpdateContactRequestTopicsItemStatus(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            UpdateContactRequestTopicsItemStatus value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override UpdateContactRequestTopicsItemStatus ReadAsPropertyName(
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
            return new UpdateContactRequestTopicsItemStatus(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            UpdateContactRequestTopicsItemStatus value,
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
