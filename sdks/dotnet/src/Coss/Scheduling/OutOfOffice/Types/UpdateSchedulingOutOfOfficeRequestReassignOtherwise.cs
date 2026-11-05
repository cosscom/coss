using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss.Scheduling;

[JsonConverter(
    typeof(UpdateSchedulingOutOfOfficeRequestReassignOtherwise.UpdateSchedulingOutOfOfficeRequestReassignOtherwiseSerializer)
)]
[Serializable]
public readonly record struct UpdateSchedulingOutOfOfficeRequestReassignOtherwise : IStringEnum
{
    public static readonly UpdateSchedulingOutOfOfficeRequestReassignOtherwise Auto = new(
        Values.Auto
    );

    public static readonly UpdateSchedulingOutOfOfficeRequestReassignOtherwise Leave = new(
        Values.Leave
    );

    public UpdateSchedulingOutOfOfficeRequestReassignOtherwise(string value)
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
    public static UpdateSchedulingOutOfOfficeRequestReassignOtherwise FromCustom(string value)
    {
        return new UpdateSchedulingOutOfOfficeRequestReassignOtherwise(value);
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
        UpdateSchedulingOutOfOfficeRequestReassignOtherwise value1,
        string value2
    ) => value1.Value.Equals(value2);

    public static bool operator !=(
        UpdateSchedulingOutOfOfficeRequestReassignOtherwise value1,
        string value2
    ) => !value1.Value.Equals(value2);

    public static explicit operator string(
        UpdateSchedulingOutOfOfficeRequestReassignOtherwise value
    ) => value.Value;

    public static explicit operator UpdateSchedulingOutOfOfficeRequestReassignOtherwise(
        string value
    ) => new(value);

    internal class UpdateSchedulingOutOfOfficeRequestReassignOtherwiseSerializer
        : JsonConverter<UpdateSchedulingOutOfOfficeRequestReassignOtherwise>
    {
        public override UpdateSchedulingOutOfOfficeRequestReassignOtherwise Read(
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
            return new UpdateSchedulingOutOfOfficeRequestReassignOtherwise(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            UpdateSchedulingOutOfOfficeRequestReassignOtherwise value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override UpdateSchedulingOutOfOfficeRequestReassignOtherwise ReadAsPropertyName(
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
            return new UpdateSchedulingOutOfOfficeRequestReassignOtherwise(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            UpdateSchedulingOutOfOfficeRequestReassignOtherwise value,
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
