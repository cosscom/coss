using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss.Scheduling;

[JsonConverter(
    typeof(UpdateSchedulingOutOfOfficeRequestExistingBookings.UpdateSchedulingOutOfOfficeRequestExistingBookingsSerializer)
)]
[Serializable]
public readonly record struct UpdateSchedulingOutOfOfficeRequestExistingBookings : IStringEnum
{
    public static readonly UpdateSchedulingOutOfOfficeRequestExistingBookings Leave = new(
        Values.Leave
    );

    public static readonly UpdateSchedulingOutOfOfficeRequestExistingBookings Reassign = new(
        Values.Reassign
    );

    public UpdateSchedulingOutOfOfficeRequestExistingBookings(string value)
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
    public static UpdateSchedulingOutOfOfficeRequestExistingBookings FromCustom(string value)
    {
        return new UpdateSchedulingOutOfOfficeRequestExistingBookings(value);
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
        UpdateSchedulingOutOfOfficeRequestExistingBookings value1,
        string value2
    ) => value1.Value.Equals(value2);

    public static bool operator !=(
        UpdateSchedulingOutOfOfficeRequestExistingBookings value1,
        string value2
    ) => !value1.Value.Equals(value2);

    public static explicit operator string(
        UpdateSchedulingOutOfOfficeRequestExistingBookings value
    ) => value.Value;

    public static explicit operator UpdateSchedulingOutOfOfficeRequestExistingBookings(
        string value
    ) => new(value);

    internal class UpdateSchedulingOutOfOfficeRequestExistingBookingsSerializer
        : JsonConverter<UpdateSchedulingOutOfOfficeRequestExistingBookings>
    {
        public override UpdateSchedulingOutOfOfficeRequestExistingBookings Read(
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
            return new UpdateSchedulingOutOfOfficeRequestExistingBookings(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            UpdateSchedulingOutOfOfficeRequestExistingBookings value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override UpdateSchedulingOutOfOfficeRequestExistingBookings ReadAsPropertyName(
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
            return new UpdateSchedulingOutOfOfficeRequestExistingBookings(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            UpdateSchedulingOutOfOfficeRequestExistingBookings value,
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
        public const string Leave = "leave";

        public const string Reassign = "reassign";
    }
}
