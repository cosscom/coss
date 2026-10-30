using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(SubaccountStatus.SubaccountStatusSerializer))]
[Serializable]
public readonly record struct SubaccountStatus : IStringEnum
{
    public static readonly SubaccountStatus Active = new(Values.Active);

    public static readonly SubaccountStatus Disabled = new(Values.Disabled);

    public static readonly SubaccountStatus Deleting = new(Values.Deleting);

    public SubaccountStatus(string value)
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
    public static SubaccountStatus FromCustom(string value)
    {
        return new SubaccountStatus(value);
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

    public static bool operator ==(SubaccountStatus value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(SubaccountStatus value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(SubaccountStatus value) => value.Value;

    public static explicit operator SubaccountStatus(string value) => new(value);

    internal class SubaccountStatusSerializer : JsonConverter<SubaccountStatus>
    {
        public override SubaccountStatus Read(
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
            return new SubaccountStatus(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            SubaccountStatus value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override SubaccountStatus ReadAsPropertyName(
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
            return new SubaccountStatus(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            SubaccountStatus value,
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

        public const string Disabled = "disabled";

        public const string Deleting = "deleting";
    }
}
