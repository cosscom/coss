using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss.Scheduling;

[JsonConverter(
    typeof(UndoSchedulingReassignmentRequestReasonCode.UndoSchedulingReassignmentRequestReasonCodeSerializer)
)]
[Serializable]
public readonly record struct UndoSchedulingReassignmentRequestReasonCode : IStringEnum
{
    public static readonly UndoSchedulingReassignmentRequestReasonCode HostUnavailable = new(
        Values.HostUnavailable
    );

    public static readonly UndoSchedulingReassignmentRequestReasonCode OutOfOffice = new(
        Values.OutOfOffice
    );

    public static readonly UndoSchedulingReassignmentRequestReasonCode Workload = new(
        Values.Workload
    );

    public static readonly UndoSchedulingReassignmentRequestReasonCode CustomerRequest = new(
        Values.CustomerRequest
    );

    public static readonly UndoSchedulingReassignmentRequestReasonCode Offboarding = new(
        Values.Offboarding
    );

    public static readonly UndoSchedulingReassignmentRequestReasonCode Other = new(Values.Other);

    public UndoSchedulingReassignmentRequestReasonCode(string value)
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
    public static UndoSchedulingReassignmentRequestReasonCode FromCustom(string value)
    {
        return new UndoSchedulingReassignmentRequestReasonCode(value);
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
        UndoSchedulingReassignmentRequestReasonCode value1,
        string value2
    ) => value1.Value.Equals(value2);

    public static bool operator !=(
        UndoSchedulingReassignmentRequestReasonCode value1,
        string value2
    ) => !value1.Value.Equals(value2);

    public static explicit operator string(UndoSchedulingReassignmentRequestReasonCode value) =>
        value.Value;

    public static explicit operator UndoSchedulingReassignmentRequestReasonCode(string value) =>
        new(value);

    internal class UndoSchedulingReassignmentRequestReasonCodeSerializer
        : JsonConverter<UndoSchedulingReassignmentRequestReasonCode>
    {
        public override UndoSchedulingReassignmentRequestReasonCode Read(
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
            return new UndoSchedulingReassignmentRequestReasonCode(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            UndoSchedulingReassignmentRequestReasonCode value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override UndoSchedulingReassignmentRequestReasonCode ReadAsPropertyName(
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
            return new UndoSchedulingReassignmentRequestReasonCode(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            UndoSchedulingReassignmentRequestReasonCode value,
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
