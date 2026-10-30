using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(SubaccountListObject.SubaccountListObjectSerializer))]
[Serializable]
public readonly record struct SubaccountListObject : IStringEnum
{
    public static readonly SubaccountListObject List = new(Values.List);

    public SubaccountListObject(string value)
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
    public static SubaccountListObject FromCustom(string value)
    {
        return new SubaccountListObject(value);
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

    public static bool operator ==(SubaccountListObject value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(SubaccountListObject value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(SubaccountListObject value) => value.Value;

    public static explicit operator SubaccountListObject(string value) => new(value);

    internal class SubaccountListObjectSerializer : JsonConverter<SubaccountListObject>
    {
        public override SubaccountListObject Read(
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
            return new SubaccountListObject(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            SubaccountListObject value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override SubaccountListObject ReadAsPropertyName(
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
            return new SubaccountListObject(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            SubaccountListObject value,
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
        public const string List = "list";
    }
}
