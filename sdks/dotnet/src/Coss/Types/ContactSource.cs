using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(ContactSource.ContactSourceSerializer))]
[Serializable]
public readonly record struct ContactSource : IStringEnum
{
    public static readonly ContactSource Api = new(Values.Api);

    public static readonly ContactSource Dashboard = new(Values.Dashboard);

    public static readonly ContactSource Import = new(Values.Import);

    public static readonly ContactSource PreferenceCenter = new(Values.PreferenceCenter);

    public ContactSource(string value)
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
    public static ContactSource FromCustom(string value)
    {
        return new ContactSource(value);
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

    public static bool operator ==(ContactSource value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(ContactSource value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(ContactSource value) => value.Value;

    public static explicit operator ContactSource(string value) => new(value);

    internal class ContactSourceSerializer : JsonConverter<ContactSource>
    {
        public override ContactSource Read(
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
            return new ContactSource(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            ContactSource value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override ContactSource ReadAsPropertyName(
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
            return new ContactSource(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            ContactSource value,
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
        public const string Api = "api";

        public const string Dashboard = "dashboard";

        public const string Import = "import";

        public const string PreferenceCenter = "preference_center";
    }
}
