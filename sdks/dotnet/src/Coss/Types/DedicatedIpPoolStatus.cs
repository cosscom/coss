using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(DedicatedIpPoolStatus.DedicatedIpPoolStatusSerializer))]
[Serializable]
public readonly record struct DedicatedIpPoolStatus : IStringEnum
{
    public static readonly DedicatedIpPoolStatus NotEnabled = new(Values.NotEnabled);

    public static readonly DedicatedIpPoolStatus Waiting = new(Values.Waiting);

    public static readonly DedicatedIpPoolStatus Provisioning = new(Values.Provisioning);

    public static readonly DedicatedIpPoolStatus Warming = new(Values.Warming);

    public static readonly DedicatedIpPoolStatus Ready = new(Values.Ready);

    public static readonly DedicatedIpPoolStatus Releasing = new(Values.Releasing);

    public DedicatedIpPoolStatus(string value)
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
    public static DedicatedIpPoolStatus FromCustom(string value)
    {
        return new DedicatedIpPoolStatus(value);
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

    public static bool operator ==(DedicatedIpPoolStatus value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(DedicatedIpPoolStatus value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(DedicatedIpPoolStatus value) => value.Value;

    public static explicit operator DedicatedIpPoolStatus(string value) => new(value);

    internal class DedicatedIpPoolStatusSerializer : JsonConverter<DedicatedIpPoolStatus>
    {
        public override DedicatedIpPoolStatus Read(
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
            return new DedicatedIpPoolStatus(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            DedicatedIpPoolStatus value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override DedicatedIpPoolStatus ReadAsPropertyName(
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
            return new DedicatedIpPoolStatus(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            DedicatedIpPoolStatus value,
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
        public const string NotEnabled = "not_enabled";

        public const string Waiting = "waiting";

        public const string Provisioning = "provisioning";

        public const string Warming = "warming";

        public const string Ready = "ready";

        public const string Releasing = "releasing";
    }
}
