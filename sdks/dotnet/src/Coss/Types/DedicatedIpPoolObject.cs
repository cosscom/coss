using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(DedicatedIpPoolObject.DedicatedIpPoolObjectSerializer))]
[Serializable]
public readonly record struct DedicatedIpPoolObject : IStringEnum
{
    public static readonly DedicatedIpPoolObject DedicatedIpPool = new(Values.DedicatedIpPool);

    public DedicatedIpPoolObject(string value)
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
    public static DedicatedIpPoolObject FromCustom(string value)
    {
        return new DedicatedIpPoolObject(value);
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

    public static bool operator ==(DedicatedIpPoolObject value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(DedicatedIpPoolObject value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(DedicatedIpPoolObject value) => value.Value;

    public static explicit operator DedicatedIpPoolObject(string value) => new(value);

    internal class DedicatedIpPoolObjectSerializer : JsonConverter<DedicatedIpPoolObject>
    {
        public override DedicatedIpPoolObject Read(
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
            return new DedicatedIpPoolObject(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            DedicatedIpPoolObject value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override DedicatedIpPoolObject ReadAsPropertyName(
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
            return new DedicatedIpPoolObject(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            DedicatedIpPoolObject value,
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
        public const string DedicatedIpPool = "dedicated_ip_pool";
    }
}
