using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[JsonConverter(typeof(ContactWebhookEventDataSource.ContactWebhookEventDataSourceSerializer))]
[Serializable]
public readonly record struct ContactWebhookEventDataSource : IStringEnum
{
    public static readonly ContactWebhookEventDataSource Api = new(Values.Api);

    public static readonly ContactWebhookEventDataSource Dashboard = new(Values.Dashboard);

    public static readonly ContactWebhookEventDataSource Import = new(Values.Import);

    public static readonly ContactWebhookEventDataSource PreferenceCenter = new(
        Values.PreferenceCenter
    );

    public ContactWebhookEventDataSource(string value)
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
    public static ContactWebhookEventDataSource FromCustom(string value)
    {
        return new ContactWebhookEventDataSource(value);
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

    public static bool operator ==(ContactWebhookEventDataSource value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(ContactWebhookEventDataSource value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(ContactWebhookEventDataSource value) => value.Value;

    public static explicit operator ContactWebhookEventDataSource(string value) => new(value);

    internal class ContactWebhookEventDataSourceSerializer
        : JsonConverter<ContactWebhookEventDataSource>
    {
        public override ContactWebhookEventDataSource Read(
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
            return new ContactWebhookEventDataSource(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            ContactWebhookEventDataSource value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override ContactWebhookEventDataSource ReadAsPropertyName(
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
            return new ContactWebhookEventDataSource(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            ContactWebhookEventDataSource value,
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
