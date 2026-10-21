using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(DeletedReceivedEmailObject.DeletedReceivedEmailObjectSerializer))]
[Serializable]
public readonly record struct DeletedReceivedEmailObject : IStringEnum
{
    public static readonly DeletedReceivedEmailObject ReceivedEmail = new(Values.ReceivedEmail);

    public DeletedReceivedEmailObject(string value)
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
    public static DeletedReceivedEmailObject FromCustom(string value)
    {
        return new DeletedReceivedEmailObject(value);
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

    public static bool operator ==(DeletedReceivedEmailObject value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(DeletedReceivedEmailObject value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(DeletedReceivedEmailObject value) => value.Value;

    public static explicit operator DeletedReceivedEmailObject(string value) => new(value);

    internal class DeletedReceivedEmailObjectSerializer : JsonConverter<DeletedReceivedEmailObject>
    {
        public override DeletedReceivedEmailObject Read(
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
            return new DeletedReceivedEmailObject(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            DeletedReceivedEmailObject value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override DeletedReceivedEmailObject ReadAsPropertyName(
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
            return new DeletedReceivedEmailObject(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            DeletedReceivedEmailObject value,
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
        public const string ReceivedEmail = "received_email";
    }
}
