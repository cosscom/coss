using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(SubaccountObject.SubaccountObjectSerializer))]
[Serializable]
public readonly record struct SubaccountObject : IStringEnum
{
    public static readonly SubaccountObject Subaccount = new(Values.Subaccount);

    public SubaccountObject(string value)
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
    public static SubaccountObject FromCustom(string value)
    {
        return new SubaccountObject(value);
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

    public static bool operator ==(SubaccountObject value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(SubaccountObject value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(SubaccountObject value) => value.Value;

    public static explicit operator SubaccountObject(string value) => new(value);

    internal class SubaccountObjectSerializer : JsonConverter<SubaccountObject>
    {
        public override SubaccountObject Read(
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
            return new SubaccountObject(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            SubaccountObject value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override SubaccountObject ReadAsPropertyName(
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
            return new SubaccountObject(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            SubaccountObject value,
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
        public const string Subaccount = "subaccount";
    }
}
