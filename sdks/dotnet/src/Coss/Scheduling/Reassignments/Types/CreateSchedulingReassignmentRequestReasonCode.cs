using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss.Scheduling;

[JsonConverter(
    typeof(CreateSchedulingReassignmentRequestReasonCode.CreateSchedulingReassignmentRequestReasonCodeSerializer)
)]
[Serializable]
public readonly record struct CreateSchedulingReassignmentRequestReasonCode : IStringEnum
{
    public static readonly CreateSchedulingReassignmentRequestReasonCode HostUnavailable = new(
        Values.HostUnavailable
    );

    public static readonly CreateSchedulingReassignmentRequestReasonCode OutOfOffice = new(
        Values.OutOfOffice
    );

    public static readonly CreateSchedulingReassignmentRequestReasonCode Workload = new(
        Values.Workload
    );

    public static readonly CreateSchedulingReassignmentRequestReasonCode CustomerRequest = new(
        Values.CustomerRequest
    );

    public static readonly CreateSchedulingReassignmentRequestReasonCode Offboarding = new(
        Values.Offboarding
    );

    public static readonly CreateSchedulingReassignmentRequestReasonCode Other = new(Values.Other);

    public CreateSchedulingReassignmentRequestReasonCode(string value)
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
    public static CreateSchedulingReassignmentRequestReasonCode FromCustom(string value)
    {
        return new CreateSchedulingReassignmentRequestReasonCode(value);
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
        CreateSchedulingReassignmentRequestReasonCode value1,
        string value2
    ) => value1.Value.Equals(value2);

    public static bool operator !=(
        CreateSchedulingReassignmentRequestReasonCode value1,
        string value2
    ) => !value1.Value.Equals(value2);

    public static explicit operator string(CreateSchedulingReassignmentRequestReasonCode value) =>
        value.Value;

    public static explicit operator CreateSchedulingReassignmentRequestReasonCode(string value) =>
        new(value);

    internal class CreateSchedulingReassignmentRequestReasonCodeSerializer
        : JsonConverter<CreateSchedulingReassignmentRequestReasonCode>
    {
        public override CreateSchedulingReassignmentRequestReasonCode Read(
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
            return new CreateSchedulingReassignmentRequestReasonCode(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            CreateSchedulingReassignmentRequestReasonCode value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override CreateSchedulingReassignmentRequestReasonCode ReadAsPropertyName(
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
            return new CreateSchedulingReassignmentRequestReasonCode(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            CreateSchedulingReassignmentRequestReasonCode value,
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
