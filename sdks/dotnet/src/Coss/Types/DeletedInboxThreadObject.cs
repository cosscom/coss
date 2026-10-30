using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(DeletedInboxThreadObject.DeletedInboxThreadObjectSerializer))]
[Serializable]
public readonly record struct DeletedInboxThreadObject : IStringEnum
{
    public static readonly DeletedInboxThreadObject InboxThread = new(Values.InboxThread);

    public DeletedInboxThreadObject(string value)
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
    public static DeletedInboxThreadObject FromCustom(string value)
    {
        return new DeletedInboxThreadObject(value);
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

    public static bool operator ==(DeletedInboxThreadObject value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(DeletedInboxThreadObject value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(DeletedInboxThreadObject value) => value.Value;

    public static explicit operator DeletedInboxThreadObject(string value) => new(value);

    internal class DeletedInboxThreadObjectSerializer : JsonConverter<DeletedInboxThreadObject>
    {
        public override DeletedInboxThreadObject Read(
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
            return new DeletedInboxThreadObject(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            DeletedInboxThreadObject value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override DeletedInboxThreadObject ReadAsPropertyName(
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
            return new DeletedInboxThreadObject(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            DeletedInboxThreadObject value,
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
        public const string InboxThread = "inbox_thread";
    }
}
