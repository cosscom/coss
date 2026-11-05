using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss.Scheduling;

[JsonConverter(
    typeof(UndoSchedulingReassignmentRequestNotifyHosts.UndoSchedulingReassignmentRequestNotifyHostsSerializer)
)]
[Serializable]
public readonly record struct UndoSchedulingReassignmentRequestNotifyHosts : IStringEnum
{
    public static readonly UndoSchedulingReassignmentRequestNotifyHosts Digest = new(Values.Digest);

    public static readonly UndoSchedulingReassignmentRequestNotifyHosts Each = new(Values.Each);

    public static readonly UndoSchedulingReassignmentRequestNotifyHosts None = new(Values.None);

    public UndoSchedulingReassignmentRequestNotifyHosts(string value)
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
    public static UndoSchedulingReassignmentRequestNotifyHosts FromCustom(string value)
    {
        return new UndoSchedulingReassignmentRequestNotifyHosts(value);
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
        UndoSchedulingReassignmentRequestNotifyHosts value1,
        string value2
    ) => value1.Value.Equals(value2);

    public static bool operator !=(
        UndoSchedulingReassignmentRequestNotifyHosts value1,
        string value2
    ) => !value1.Value.Equals(value2);

    public static explicit operator string(UndoSchedulingReassignmentRequestNotifyHosts value) =>
        value.Value;

    public static explicit operator UndoSchedulingReassignmentRequestNotifyHosts(string value) =>
        new(value);

    internal class UndoSchedulingReassignmentRequestNotifyHostsSerializer
        : JsonConverter<UndoSchedulingReassignmentRequestNotifyHosts>
    {
        public override UndoSchedulingReassignmentRequestNotifyHosts Read(
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
            return new UndoSchedulingReassignmentRequestNotifyHosts(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            UndoSchedulingReassignmentRequestNotifyHosts value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override UndoSchedulingReassignmentRequestNotifyHosts ReadAsPropertyName(
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
            return new UndoSchedulingReassignmentRequestNotifyHosts(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            UndoSchedulingReassignmentRequestNotifyHosts value,
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
        public const string Digest = "digest";

        public const string Each = "each";

        public const string None = "none";
    }
}
