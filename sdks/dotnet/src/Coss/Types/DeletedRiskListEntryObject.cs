using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(DeletedRiskListEntryObject.DeletedRiskListEntryObjectSerializer))]
[Serializable]
public readonly record struct DeletedRiskListEntryObject : IStringEnum
{
    public static readonly DeletedRiskListEntryObject RiskListEntry = new(Values.RiskListEntry);

    public DeletedRiskListEntryObject(string value)
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
    public static DeletedRiskListEntryObject FromCustom(string value)
    {
        return new DeletedRiskListEntryObject(value);
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

    public static bool operator ==(DeletedRiskListEntryObject value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(DeletedRiskListEntryObject value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(DeletedRiskListEntryObject value) => value.Value;

    public static explicit operator DeletedRiskListEntryObject(string value) => new(value);

    internal class DeletedRiskListEntryObjectSerializer : JsonConverter<DeletedRiskListEntryObject>
    {
        public override DeletedRiskListEntryObject Read(
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
            return new DeletedRiskListEntryObject(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            DeletedRiskListEntryObject value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override DeletedRiskListEntryObject ReadAsPropertyName(
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
            return new DeletedRiskListEntryObject(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            DeletedRiskListEntryObject value,
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
        public const string RiskListEntry = "risk_list_entry";
    }
}
