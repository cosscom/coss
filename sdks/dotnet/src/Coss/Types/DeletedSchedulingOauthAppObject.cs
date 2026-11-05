using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(DeletedSchedulingOauthAppObject.DeletedSchedulingOauthAppObjectSerializer))]
[Serializable]
public readonly record struct DeletedSchedulingOauthAppObject : IStringEnum
{
    public static readonly DeletedSchedulingOauthAppObject SchedulingOauthApp = new(
        Values.SchedulingOauthApp
    );

    public DeletedSchedulingOauthAppObject(string value)
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
    public static DeletedSchedulingOauthAppObject FromCustom(string value)
    {
        return new DeletedSchedulingOauthAppObject(value);
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

    public static bool operator ==(DeletedSchedulingOauthAppObject value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(DeletedSchedulingOauthAppObject value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(DeletedSchedulingOauthAppObject value) => value.Value;

    public static explicit operator DeletedSchedulingOauthAppObject(string value) => new(value);

    internal class DeletedSchedulingOauthAppObjectSerializer
        : JsonConverter<DeletedSchedulingOauthAppObject>
    {
        public override DeletedSchedulingOauthAppObject Read(
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
            return new DeletedSchedulingOauthAppObject(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            DeletedSchedulingOauthAppObject value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override DeletedSchedulingOauthAppObject ReadAsPropertyName(
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
            return new DeletedSchedulingOauthAppObject(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            DeletedSchedulingOauthAppObject value,
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
        public const string SchedulingOauthApp = "scheduling.oauth_app";
    }
}
