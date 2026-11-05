using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss.Scheduling;

[JsonConverter(
    typeof(CreateSchedulingOutOfOfficeRequestReassignOtherwise.CreateSchedulingOutOfOfficeRequestReassignOtherwiseSerializer)
)]
[Serializable]
public readonly record struct CreateSchedulingOutOfOfficeRequestReassignOtherwise : IStringEnum
{
    public static readonly CreateSchedulingOutOfOfficeRequestReassignOtherwise Auto = new(
        Values.Auto
    );

    public static readonly CreateSchedulingOutOfOfficeRequestReassignOtherwise Leave = new(
        Values.Leave
    );

    public CreateSchedulingOutOfOfficeRequestReassignOtherwise(string value)
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
    public static CreateSchedulingOutOfOfficeRequestReassignOtherwise FromCustom(string value)
    {
        return new CreateSchedulingOutOfOfficeRequestReassignOtherwise(value);
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
        CreateSchedulingOutOfOfficeRequestReassignOtherwise value1,
        string value2
    ) => value1.Value.Equals(value2);

    public static bool operator !=(
        CreateSchedulingOutOfOfficeRequestReassignOtherwise value1,
        string value2
    ) => !value1.Value.Equals(value2);

    public static explicit operator string(
        CreateSchedulingOutOfOfficeRequestReassignOtherwise value
    ) => value.Value;

    public static explicit operator CreateSchedulingOutOfOfficeRequestReassignOtherwise(
        string value
    ) => new(value);

    internal class CreateSchedulingOutOfOfficeRequestReassignOtherwiseSerializer
        : JsonConverter<CreateSchedulingOutOfOfficeRequestReassignOtherwise>
    {
        public override CreateSchedulingOutOfOfficeRequestReassignOtherwise Read(
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
            return new CreateSchedulingOutOfOfficeRequestReassignOtherwise(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            CreateSchedulingOutOfOfficeRequestReassignOtherwise value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override CreateSchedulingOutOfOfficeRequestReassignOtherwise ReadAsPropertyName(
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
            return new CreateSchedulingOutOfOfficeRequestReassignOtherwise(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            CreateSchedulingOutOfOfficeRequestReassignOtherwise value,
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
