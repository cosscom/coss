using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[Serializable]
public record SmsNumber : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    [JsonPropertyName("object")]
    public required SmsNumberObject Object { get; set; }

    [JsonPropertyName("id")]
    public required string Id { get; set; }

    [JsonPropertyName("phone_number")]
    public required string PhoneNumber { get; set; }

    [JsonPropertyName("kind")]
    public required SmsNumberKind Kind { get; set; }

    [JsonPropertyName("country")]
    public required string Country { get; set; }

    [JsonPropertyName("status")]
    public required SmsNumberStatus Status { get; set; }

    /// <summary>
    /// Its carrier registration's status; live sends need `approved`.
    /// </summary>
    [JsonPropertyName("registration_status")]
    public SmsNumberRegistrationStatus? RegistrationStatus { get; set; }

    /// <summary>
    /// Whether live sends can go from it now.
    /// </summary>
    [JsonPropertyName("can_send")]
    public required bool CanSend { get; set; }

    /// <summary>
    /// Whether replies to it arrive in the environment of the key making the request.
    /// </summary>
    [JsonPropertyName("receives_here")]
    public required bool ReceivesHere { get; set; }

    [JsonPropertyName("created_at")]
    public required DateTime CreatedAt { get; set; }

    [JsonIgnore]
    public ReadOnlyAdditionalProperties AdditionalProperties { get; private set; } = new();

    void IJsonOnDeserialized.OnDeserialized() =>
        AdditionalProperties.CopyFromExtensionData(_extensionData);

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
