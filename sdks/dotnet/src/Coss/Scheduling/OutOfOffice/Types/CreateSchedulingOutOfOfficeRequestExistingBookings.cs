using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss.Scheduling;

[JsonConverter(
    typeof(CreateSchedulingOutOfOfficeRequestExistingBookings.CreateSchedulingOutOfOfficeRequestExistingBookingsSerializer)
)]
[Serializable]
public readonly record struct CreateSchedulingOutOfOfficeRequestExistingBookings : IStringEnum
{
    public static readonly CreateSchedulingOutOfOfficeRequestExistingBookings Leave = new(
        Values.Leave
    );

    public static readonly CreateSchedulingOutOfOfficeRequestExistingBookings Reassign = new(
        Values.Reassign
    );

    public CreateSchedulingOutOfOfficeRequestExistingBookings(string value)
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
    public static CreateSchedulingOutOfOfficeRequestExistingBookings FromCustom(string value)
    {
        return new CreateSchedulingOutOfOfficeRequestExistingBookings(value);
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
        CreateSchedulingOutOfOfficeRequestExistingBookings value1,
        string value2
    ) => value1.Value.Equals(value2);

    public static bool operator !=(
        CreateSchedulingOutOfOfficeRequestExistingBookings value1,
        string value2
    ) => !value1.Value.Equals(value2);

    public static explicit operator string(
        CreateSchedulingOutOfOfficeRequestExistingBookings value
    ) => value.Value;

    public static explicit operator CreateSchedulingOutOfOfficeRequestExistingBookings(
        string value
    ) => new(value);

    internal class CreateSchedulingOutOfOfficeRequestExistingBookingsSerializer
        : JsonConverter<CreateSchedulingOutOfOfficeRequestExistingBookings>
    {
        public override CreateSchedulingOutOfOfficeRequestExistingBookings Read(
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
            return new CreateSchedulingOutOfOfficeRequestExistingBookings(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            CreateSchedulingOutOfOfficeRequestExistingBookings value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override CreateSchedulingOutOfOfficeRequestExistingBookings ReadAsPropertyName(
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
            return new CreateSchedulingOutOfOfficeRequestExistingBookings(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            CreateSchedulingOutOfOfficeRequestExistingBookings value,
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
