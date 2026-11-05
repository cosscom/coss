using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss.Scheduling;

[JsonConverter(
    typeof(UpdateSchedulingSettingsRequestHostReassignment.UpdateSchedulingSettingsRequestHostReassignmentSerializer)
)]
[Serializable]
public readonly record struct UpdateSchedulingSettingsRequestHostReassignment : IStringEnum
{
    public static readonly UpdateSchedulingSettingsRequestHostReassignment Off = new(Values.Off);

    public static readonly UpdateSchedulingSettingsRequestHostReassignment Eligible = new(
        Values.Eligible
    );

    public UpdateSchedulingSettingsRequestHostReassignment(string value)
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
    public static UpdateSchedulingSettingsRequestHostReassignment FromCustom(string value)
    {
        return new UpdateSchedulingSettingsRequestHostReassignment(value);
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
        UpdateSchedulingSettingsRequestHostReassignment value1,
        string value2
    ) => value1.Value.Equals(value2);

    public static bool operator !=(
        UpdateSchedulingSettingsRequestHostReassignment value1,
        string value2
    ) => !value1.Value.Equals(value2);

    public static explicit operator string(UpdateSchedulingSettingsRequestHostReassignment value) =>
        value.Value;

    public static explicit operator UpdateSchedulingSettingsRequestHostReassignment(string value) =>
        new(value);

    internal class UpdateSchedulingSettingsRequestHostReassignmentSerializer
        : JsonConverter<UpdateSchedulingSettingsRequestHostReassignment>
    {
        public override UpdateSchedulingSettingsRequestHostReassignment Read(
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
            return new UpdateSchedulingSettingsRequestHostReassignment(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            UpdateSchedulingSettingsRequestHostReassignment value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override UpdateSchedulingSettingsRequestHostReassignment ReadAsPropertyName(
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
            return new UpdateSchedulingSettingsRequestHostReassignment(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            UpdateSchedulingSettingsRequestHostReassignment value,
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
        public const string Off = "off";

        public const string Eligible = "eligible";
    }
}
