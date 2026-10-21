using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(ListSuppressionsRequestScopeZero.ListSuppressionsRequestScopeZeroSerializer))]
[Serializable]
public readonly record struct ListSuppressionsRequestScopeZero : IStringEnum
{
    public static readonly ListSuppressionsRequestScopeZero All = new(Values.All);

    public ListSuppressionsRequestScopeZero(string value)
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
    public static ListSuppressionsRequestScopeZero FromCustom(string value)
    {
        return new ListSuppressionsRequestScopeZero(value);
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

    public static bool operator ==(ListSuppressionsRequestScopeZero value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(ListSuppressionsRequestScopeZero value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(ListSuppressionsRequestScopeZero value) => value.Value;

    public static explicit operator ListSuppressionsRequestScopeZero(string value) => new(value);

    internal class ListSuppressionsRequestScopeZeroSerializer
        : JsonConverter<ListSuppressionsRequestScopeZero>
    {
        public override ListSuppressionsRequestScopeZero Read(
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
            return new ListSuppressionsRequestScopeZero(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            ListSuppressionsRequestScopeZero value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override ListSuppressionsRequestScopeZero ReadAsPropertyName(
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
            return new ListSuppressionsRequestScopeZero(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            ListSuppressionsRequestScopeZero value,
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
        public const string All = "*";
    }
}
