using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss.Email;

[JsonConverter(
    typeof(CreateSuppressionRequestScopeZero.CreateSuppressionRequestScopeZeroSerializer)
)]
[Serializable]
public readonly record struct CreateSuppressionRequestScopeZero : IStringEnum
{
    public static readonly CreateSuppressionRequestScopeZero All = new(Values.All);

    public CreateSuppressionRequestScopeZero(string value)
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
    public static CreateSuppressionRequestScopeZero FromCustom(string value)
    {
        return new CreateSuppressionRequestScopeZero(value);
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

    public static bool operator ==(CreateSuppressionRequestScopeZero value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(CreateSuppressionRequestScopeZero value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(CreateSuppressionRequestScopeZero value) => value.Value;

    public static explicit operator CreateSuppressionRequestScopeZero(string value) => new(value);

    internal class CreateSuppressionRequestScopeZeroSerializer
        : JsonConverter<CreateSuppressionRequestScopeZero>
    {
        public override CreateSuppressionRequestScopeZero Read(
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
            return new CreateSuppressionRequestScopeZero(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            CreateSuppressionRequestScopeZero value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override CreateSuppressionRequestScopeZero ReadAsPropertyName(
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
            return new CreateSuppressionRequestScopeZero(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            CreateSuppressionRequestScopeZero value,
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
        public const string All = "*";
    }
}
