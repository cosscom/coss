using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(DeletedInboxObject.DeletedInboxObjectSerializer))]
[Serializable]
public readonly record struct DeletedInboxObject : IStringEnum
{
    public static readonly DeletedInboxObject Inbox = new(Values.Inbox);

    public DeletedInboxObject(string value)
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
    public static DeletedInboxObject FromCustom(string value)
    {
        return new DeletedInboxObject(value);
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

    public static bool operator ==(DeletedInboxObject value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(DeletedInboxObject value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(DeletedInboxObject value) => value.Value;

    public static explicit operator DeletedInboxObject(string value) => new(value);

    internal class DeletedInboxObjectSerializer : JsonConverter<DeletedInboxObject>
    {
        public override DeletedInboxObject Read(
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
            return new DeletedInboxObject(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            DeletedInboxObject value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override DeletedInboxObject ReadAsPropertyName(
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
            return new DeletedInboxObject(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            DeletedInboxObject value,
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
        public const string Inbox = "inbox";
    }
}
