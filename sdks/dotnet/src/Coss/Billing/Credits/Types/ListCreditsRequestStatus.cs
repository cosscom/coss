using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss.Billing;

[JsonConverter(typeof(ListCreditsRequestStatus.ListCreditsRequestStatusSerializer))]
[Serializable]
public readonly record struct ListCreditsRequestStatus : IStringEnum
{
    public static readonly ListCreditsRequestStatus Active = new(Values.Active);

    public static readonly ListCreditsRequestStatus All = new(Values.All);

    public ListCreditsRequestStatus(string value)
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
    public static ListCreditsRequestStatus FromCustom(string value)
    {
        return new ListCreditsRequestStatus(value);
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

    public static bool operator ==(ListCreditsRequestStatus value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(ListCreditsRequestStatus value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(ListCreditsRequestStatus value) => value.Value;

    public static explicit operator ListCreditsRequestStatus(string value) => new(value);

    internal class ListCreditsRequestStatusSerializer : JsonConverter<ListCreditsRequestStatus>
    {
        public override ListCreditsRequestStatus Read(
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
            return new ListCreditsRequestStatus(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            ListCreditsRequestStatus value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override ListCreditsRequestStatus ReadAsPropertyName(
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
            return new ListCreditsRequestStatus(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            ListCreditsRequestStatus value,
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

        public const string All = "all";
    }
}
