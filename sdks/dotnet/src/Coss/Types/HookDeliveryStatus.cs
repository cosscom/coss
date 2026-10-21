using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(HookDeliveryStatus.HookDeliveryStatusSerializer))]
[Serializable]
public readonly record struct HookDeliveryStatus : IStringEnum
{
    public static readonly HookDeliveryStatus Pending = new(Values.Pending);

    public static readonly HookDeliveryStatus Succeeded = new(Values.Succeeded);

    public static readonly HookDeliveryStatus Failed = new(Values.Failed);

    public HookDeliveryStatus(string value)
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
    public static HookDeliveryStatus FromCustom(string value)
    {
        return new HookDeliveryStatus(value);
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

    public static bool operator ==(HookDeliveryStatus value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(HookDeliveryStatus value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(HookDeliveryStatus value) => value.Value;

    public static explicit operator HookDeliveryStatus(string value) => new(value);

    internal class HookDeliveryStatusSerializer : JsonConverter<HookDeliveryStatus>
    {
        public override HookDeliveryStatus Read(
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
            return new HookDeliveryStatus(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            HookDeliveryStatus value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override HookDeliveryStatus ReadAsPropertyName(
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
            return new HookDeliveryStatus(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            HookDeliveryStatus value,
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
        public const string Pending = "pending";

        public const string Succeeded = "succeeded";

        public const string Failed = "failed";
    }
}
