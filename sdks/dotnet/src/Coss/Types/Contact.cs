using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using OneOf;

namespace Coss;

[Serializable]
public record Contact : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    [JsonPropertyName("object")]
    public required ContactObject Object { get; set; }

    [JsonPropertyName("id")]
    public required string Id { get; set; }

    [JsonPropertyName("email")]
    public required string Email { get; set; }

    [Nullable]
    [JsonPropertyName("first_name")]
    public string? FirstName { get; set; }

    [Nullable]
    [JsonPropertyName("last_name")]
    public string? LastName { get; set; }

    /// <summary>
    /// Consent to marketing email: `subscribed`, `unsubscribed` (never receives marketing email; transactional email is unaffected) or `pending` (waiting for a double opt-in confirmation).
    /// </summary>
    [JsonPropertyName("status")]
    public required ContactStatus Status { get; set; }

    [JsonPropertyName("properties")]
    public Dictionary<string, OneOf<string, double, bool>> Properties { get; set; } =
        new Dictionary<string, OneOf<string, double, bool>>();

    /// <summary>
    /// How the contact was created.
    /// </summary>
    [JsonPropertyName("source")]
    public required ContactSource Source { get; set; }

    [Nullable]
    [JsonPropertyName("subscribed_at")]
    public DateTime? SubscribedAt { get; set; }

    [Nullable]
    [JsonPropertyName("unsubscribed_at")]
    public DateTime? UnsubscribedAt { get; set; }

    /// <summary>
    /// When the contact confirmed a double opt-in.
    /// </summary>
    [Nullable]
    [JsonPropertyName("confirmed_at")]
    public DateTime? ConfirmedAt { get; set; }

    [JsonPropertyName("created_at")]
    public required DateTime CreatedAt { get; set; }

    [JsonPropertyName("updated_at")]
    public required DateTime UpdatedAt { get; set; }

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
