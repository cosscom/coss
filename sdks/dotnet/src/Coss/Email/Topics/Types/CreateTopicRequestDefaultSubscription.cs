using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss.Email;

[JsonConverter(
    typeof(CreateTopicRequestDefaultSubscription.CreateTopicRequestDefaultSubscriptionSerializer)
)]
[Serializable]
public readonly record struct CreateTopicRequestDefaultSubscription : IStringEnum
{
    public static readonly CreateTopicRequestDefaultSubscription OptIn = new(Values.OptIn);

    public static readonly CreateTopicRequestDefaultSubscription OptOut = new(Values.OptOut);

    public CreateTopicRequestDefaultSubscription(string value)
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
    public static CreateTopicRequestDefaultSubscription FromCustom(string value)
    {
        return new CreateTopicRequestDefaultSubscription(value);
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

    public static bool operator ==(CreateTopicRequestDefaultSubscription value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(CreateTopicRequestDefaultSubscription value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(CreateTopicRequestDefaultSubscription value) =>
        value.Value;

    public static explicit operator CreateTopicRequestDefaultSubscription(string value) =>
        new(value);

    internal class CreateTopicRequestDefaultSubscriptionSerializer
        : JsonConverter<CreateTopicRequestDefaultSubscription>
    {
        public override CreateTopicRequestDefaultSubscription Read(
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
            return new CreateTopicRequestDefaultSubscription(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            CreateTopicRequestDefaultSubscription value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override CreateTopicRequestDefaultSubscription ReadAsPropertyName(
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
            return new CreateTopicRequestDefaultSubscription(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            CreateTopicRequestDefaultSubscription value,
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
