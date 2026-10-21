using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss.Hooks;

[JsonConverter(
    typeof(ListEventTypesRequestIncludeArchived.ListEventTypesRequestIncludeArchivedSerializer)
)]
[Serializable]
public readonly record struct ListEventTypesRequestIncludeArchived : IStringEnum
{
    public static readonly ListEventTypesRequestIncludeArchived True = new(Values.True);

    public static readonly ListEventTypesRequestIncludeArchived False = new(Values.False);

    public ListEventTypesRequestIncludeArchived(string value)
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
    public static ListEventTypesRequestIncludeArchived FromCustom(string value)
    {
        return new ListEventTypesRequestIncludeArchived(value);
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

    public static bool operator ==(ListEventTypesRequestIncludeArchived value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(ListEventTypesRequestIncludeArchived value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(ListEventTypesRequestIncludeArchived value) =>
        value.Value;

    public static explicit operator ListEventTypesRequestIncludeArchived(string value) =>
        new(value);

    internal class ListEventTypesRequestIncludeArchivedSerializer
        : JsonConverter<ListEventTypesRequestIncludeArchived>
    {
        public override ListEventTypesRequestIncludeArchived Read(
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
            return new ListEventTypesRequestIncludeArchived(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            ListEventTypesRequestIncludeArchived value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override ListEventTypesRequestIncludeArchived ReadAsPropertyName(
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
            return new ListEventTypesRequestIncludeArchived(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            ListEventTypesRequestIncludeArchived value,
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
        public const string True = "true";

        public const string False = "false";
    }
}
