using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(
    typeof(SchedulingReassignmentStrategyOtherwise.SchedulingReassignmentStrategyOtherwiseSerializer)
)]
[Serializable]
public readonly record struct SchedulingReassignmentStrategyOtherwise : IStringEnum
{
    public static readonly SchedulingReassignmentStrategyOtherwise Auto = new(Values.Auto);

    public static readonly SchedulingReassignmentStrategyOtherwise Leave = new(Values.Leave);

    public SchedulingReassignmentStrategyOtherwise(string value)
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
    public static SchedulingReassignmentStrategyOtherwise FromCustom(string value)
    {
        return new SchedulingReassignmentStrategyOtherwise(value);
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

    public static bool operator ==(SchedulingReassignmentStrategyOtherwise value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(SchedulingReassignmentStrategyOtherwise value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(SchedulingReassignmentStrategyOtherwise value) =>
        value.Value;

    public static explicit operator SchedulingReassignmentStrategyOtherwise(string value) =>
        new(value);

    internal class SchedulingReassignmentStrategyOtherwiseSerializer
        : JsonConverter<SchedulingReassignmentStrategyOtherwise>
    {
        public override SchedulingReassignmentStrategyOtherwise Read(
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
            return new SchedulingReassignmentStrategyOtherwise(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            SchedulingReassignmentStrategyOtherwise value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override SchedulingReassignmentStrategyOtherwise ReadAsPropertyName(
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
            return new SchedulingReassignmentStrategyOtherwise(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            SchedulingReassignmentStrategyOtherwise value,
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
