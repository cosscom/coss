using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss.Email;

[JsonConverter(
    typeof(UpdateTopicRequestDefaultSubscription.UpdateTopicRequestDefaultSubscriptionSerializer)
)]
[Serializable]
public readonly record struct UpdateTopicRequestDefaultSubscription : IStringEnum
{
    public static readonly UpdateTopicRequestDefaultSubscription OptIn = new(Values.OptIn);

    public static readonly UpdateTopicRequestDefaultSubscription OptOut = new(Values.OptOut);

    public UpdateTopicRequestDefaultSubscription(string value)
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
    public static UpdateTopicRequestDefaultSubscription FromCustom(string value)
    {
        return new UpdateTopicRequestDefaultSubscription(value);
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

    public static bool operator ==(UpdateTopicRequestDefaultSubscription value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(UpdateTopicRequestDefaultSubscription value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(UpdateTopicRequestDefaultSubscription value) =>
        value.Value;

    public static explicit operator UpdateTopicRequestDefaultSubscription(string value) =>
        new(value);

    internal class UpdateTopicRequestDefaultSubscriptionSerializer
        : JsonConverter<UpdateTopicRequestDefaultSubscription>
    {
        public override UpdateTopicRequestDefaultSubscription Read(
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
            return new UpdateTopicRequestDefaultSubscription(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            UpdateTopicRequestDefaultSubscription value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override UpdateTopicRequestDefaultSubscription ReadAsPropertyName(
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
            return new UpdateTopicRequestDefaultSubscription(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            UpdateTopicRequestDefaultSubscription value,
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
        public const string OptIn = "opt_in";

        public const string OptOut = "opt_out";
    }
}
