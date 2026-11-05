using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss.Scheduling;

[JsonConverter(
    typeof(ReassignSchedulingBookingRequestReasonCode.ReassignSchedulingBookingRequestReasonCodeSerializer)
)]
[Serializable]
public readonly record struct ReassignSchedulingBookingRequestReasonCode : IStringEnum
{
    public static readonly ReassignSchedulingBookingRequestReasonCode HostUnavailable = new(
        Values.HostUnavailable
    );

    public static readonly ReassignSchedulingBookingRequestReasonCode OutOfOffice = new(
        Values.OutOfOffice
    );

    public static readonly ReassignSchedulingBookingRequestReasonCode Workload = new(
        Values.Workload
    );

    public static readonly ReassignSchedulingBookingRequestReasonCode CustomerRequest = new(
        Values.CustomerRequest
    );

    public static readonly ReassignSchedulingBookingRequestReasonCode Offboarding = new(
        Values.Offboarding
    );

    public static readonly ReassignSchedulingBookingRequestReasonCode Other = new(Values.Other);

    public ReassignSchedulingBookingRequestReasonCode(string value)
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
    public static ReassignSchedulingBookingRequestReasonCode FromCustom(string value)
    {
        return new ReassignSchedulingBookingRequestReasonCode(value);
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
        ReassignSchedulingBookingRequestReasonCode value1,
        string value2
    ) => value1.Value.Equals(value2);

    public static bool operator !=(
        ReassignSchedulingBookingRequestReasonCode value1,
        string value2
    ) => !value1.Value.Equals(value2);

    public static explicit operator string(ReassignSchedulingBookingRequestReasonCode value) =>
        value.Value;

    public static explicit operator ReassignSchedulingBookingRequestReasonCode(string value) =>
        new(value);

    internal class ReassignSchedulingBookingRequestReasonCodeSerializer
        : JsonConverter<ReassignSchedulingBookingRequestReasonCode>
    {
        public override ReassignSchedulingBookingRequestReasonCode Read(
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
            return new ReassignSchedulingBookingRequestReasonCode(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            ReassignSchedulingBookingRequestReasonCode value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override ReassignSchedulingBookingRequestReasonCode ReadAsPropertyName(
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
            return new ReassignSchedulingBookingRequestReasonCode(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            ReassignSchedulingBookingRequestReasonCode value,
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
        public const string HostUnavailable = "host_unavailable";

        public const string OutOfOffice = "out_of_office";

        public const string Workload = "workload";

        public const string CustomerRequest = "customer_request";

        public const string Offboarding = "offboarding";

        public const string Other = "other";
    }
}
