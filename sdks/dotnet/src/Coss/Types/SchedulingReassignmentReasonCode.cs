using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(SchedulingReassignmentReasonCode.SchedulingReassignmentReasonCodeSerializer))]
[Serializable]
public readonly record struct SchedulingReassignmentReasonCode : IStringEnum
{
    public static readonly SchedulingReassignmentReasonCode HostUnavailable = new(
        Values.HostUnavailable
    );

    public static readonly SchedulingReassignmentReasonCode OutOfOffice = new(Values.OutOfOffice);

    public static readonly SchedulingReassignmentReasonCode Workload = new(Values.Workload);

    public static readonly SchedulingReassignmentReasonCode CustomerRequest = new(
        Values.CustomerRequest
    );

    public static readonly SchedulingReassignmentReasonCode Offboarding = new(Values.Offboarding);

    public static readonly SchedulingReassignmentReasonCode Other = new(Values.Other);

    public SchedulingReassignmentReasonCode(string value)
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
    public static SchedulingReassignmentReasonCode FromCustom(string value)
    {
        return new SchedulingReassignmentReasonCode(value);
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

    public static bool operator ==(SchedulingReassignmentReasonCode value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(SchedulingReassignmentReasonCode value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(SchedulingReassignmentReasonCode value) => value.Value;

    public static explicit operator SchedulingReassignmentReasonCode(string value) => new(value);

    internal class SchedulingReassignmentReasonCodeSerializer
        : JsonConverter<SchedulingReassignmentReasonCode>
    {
        public override SchedulingReassignmentReasonCode Read(
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
            return new SchedulingReassignmentReasonCode(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            SchedulingReassignmentReasonCode value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override SchedulingReassignmentReasonCode ReadAsPropertyName(
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
            return new SchedulingReassignmentReasonCode(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            SchedulingReassignmentReasonCode value,
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
