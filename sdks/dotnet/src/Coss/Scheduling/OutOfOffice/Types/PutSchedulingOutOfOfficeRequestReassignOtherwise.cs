using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss.Scheduling;

[JsonConverter(
    typeof(PutSchedulingOutOfOfficeRequestReassignOtherwise.PutSchedulingOutOfOfficeRequestReassignOtherwiseSerializer)
)]
[Serializable]
public readonly record struct PutSchedulingOutOfOfficeRequestReassignOtherwise : IStringEnum
{
    public static readonly PutSchedulingOutOfOfficeRequestReassignOtherwise Auto = new(Values.Auto);

    public static readonly PutSchedulingOutOfOfficeRequestReassignOtherwise Leave = new(
        Values.Leave
    );

    public PutSchedulingOutOfOfficeRequestReassignOtherwise(string value)
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
    public static PutSchedulingOutOfOfficeRequestReassignOtherwise FromCustom(string value)
    {
        return new PutSchedulingOutOfOfficeRequestReassignOtherwise(value);
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

    public static bool operator ==(
        PutSchedulingOutOfOfficeRequestReassignOtherwise value1,
        string value2
    ) => value1.Value.Equals(value2);

    public static bool operator !=(
        PutSchedulingOutOfOfficeRequestReassignOtherwise value1,
        string value2
    ) => !value1.Value.Equals(value2);

    public static explicit operator string(
        PutSchedulingOutOfOfficeRequestReassignOtherwise value
    ) => value.Value;

    public static explicit operator PutSchedulingOutOfOfficeRequestReassignOtherwise(
        string value
    ) => new(value);

    internal class PutSchedulingOutOfOfficeRequestReassignOtherwiseSerializer
        : JsonConverter<PutSchedulingOutOfOfficeRequestReassignOtherwise>
    {
        public override PutSchedulingOutOfOfficeRequestReassignOtherwise Read(
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
            return new PutSchedulingOutOfOfficeRequestReassignOtherwise(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            PutSchedulingOutOfOfficeRequestReassignOtherwise value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override PutSchedulingOutOfOfficeRequestReassignOtherwise ReadAsPropertyName(
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
            return new PutSchedulingOutOfOfficeRequestReassignOtherwise(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            PutSchedulingOutOfOfficeRequestReassignOtherwise value,
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
        public const string Auto = "auto";

        public const string Leave = "leave";
    }
}
