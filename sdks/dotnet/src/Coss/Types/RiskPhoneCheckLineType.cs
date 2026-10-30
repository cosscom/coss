using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(RiskPhoneCheckLineType.RiskPhoneCheckLineTypeSerializer))]
[Serializable]
public readonly record struct RiskPhoneCheckLineType : IStringEnum
{
    public static readonly RiskPhoneCheckLineType Mobile = new(Values.Mobile);

    public static readonly RiskPhoneCheckLineType Landline = new(Values.Landline);

    public static readonly RiskPhoneCheckLineType FixedVoip = new(Values.FixedVoip);

    public static readonly RiskPhoneCheckLineType NonFixedVoip = new(Values.NonFixedVoip);

    public static readonly RiskPhoneCheckLineType TollFree = new(Values.TollFree);

    public static readonly RiskPhoneCheckLineType Premium = new(Values.Premium);

    public static readonly RiskPhoneCheckLineType SharedCost = new(Values.SharedCost);

    public static readonly RiskPhoneCheckLineType Personal = new(Values.Personal);

    public static readonly RiskPhoneCheckLineType Uan = new(Values.Uan);

    public static readonly RiskPhoneCheckLineType Voicemail = new(Values.Voicemail);

    public static readonly RiskPhoneCheckLineType Pager = new(Values.Pager);

    public static readonly RiskPhoneCheckLineType Unknown = new(Values.Unknown);

    public RiskPhoneCheckLineType(string value)
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
    public static RiskPhoneCheckLineType FromCustom(string value)
    {
        return new RiskPhoneCheckLineType(value);
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

    public static bool operator ==(RiskPhoneCheckLineType value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(RiskPhoneCheckLineType value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(RiskPhoneCheckLineType value) => value.Value;

    public static explicit operator RiskPhoneCheckLineType(string value) => new(value);

    internal class RiskPhoneCheckLineTypeSerializer : JsonConverter<RiskPhoneCheckLineType>
    {
        public override RiskPhoneCheckLineType Read(
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
            return new RiskPhoneCheckLineType(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            RiskPhoneCheckLineType value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override RiskPhoneCheckLineType ReadAsPropertyName(
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
            return new RiskPhoneCheckLineType(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            RiskPhoneCheckLineType value,
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
        public const string Mobile = "mobile";

        public const string Landline = "landline";

        public const string FixedVoip = "fixed_voip";

        public const string NonFixedVoip = "non_fixed_voip";

        public const string TollFree = "toll_free";

        public const string Premium = "premium";

        public const string SharedCost = "shared_cost";

        public const string Personal = "personal";

        public const string Uan = "uan";

        public const string Voicemail = "voicemail";

        public const string Pager = "pager";

        public const string Unknown = "unknown";
    }
}
