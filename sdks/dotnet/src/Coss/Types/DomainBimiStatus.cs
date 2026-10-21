using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(DomainBimiStatus.DomainBimiStatusSerializer))]
[Serializable]
public readonly record struct DomainBimiStatus : IStringEnum
{
    public static readonly DomainBimiStatus NotChecked = new(Values.NotChecked);

    public static readonly DomainBimiStatus Missing = new(Values.Missing);

    public static readonly DomainBimiStatus Invalid = new(Values.Invalid);

    public static readonly DomainBimiStatus Configured = new(Values.Configured);

    public DomainBimiStatus(string value)
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
    public static DomainBimiStatus FromCustom(string value)
    {
        return new DomainBimiStatus(value);
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

    public static bool operator ==(DomainBimiStatus value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(DomainBimiStatus value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(DomainBimiStatus value) => value.Value;

    public static explicit operator DomainBimiStatus(string value) => new(value);

    internal class DomainBimiStatusSerializer : JsonConverter<DomainBimiStatus>
    {
        public override DomainBimiStatus Read(
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
            return new DomainBimiStatus(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            DomainBimiStatus value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override DomainBimiStatus ReadAsPropertyName(
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
            return new DomainBimiStatus(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            DomainBimiStatus value,
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
        public const string NotChecked = "not_checked";

        public const string Missing = "missing";

        public const string Invalid = "invalid";

        public const string Configured = "configured";
    }
}
