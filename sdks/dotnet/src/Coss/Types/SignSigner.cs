using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[Serializable]
public record SignSigner : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    [JsonPropertyName("object")]
    public required SignSignerObject Object { get; set; }

    [JsonPropertyName("id")]
    public required string Id { get; set; }

    [JsonPropertyName("name")]
    public required string Name { get; set; }

    [JsonPropertyName("email")]
    public required string Email { get; set; }

    [JsonPropertyName("order")]
    public required long Order { get; set; }

    [JsonPropertyName("delivery")]
    public required SignSignerDelivery Delivery { get; set; }

    /// <summary>
    /// How the signer is identified: `email_link` (they opened the link coss.com emailed) or `customer_asserted` (your app vouched for them).
    /// </summary>
    [JsonPropertyName("authentication")]
    public required SignSignerAuthentication Authentication { get; set; }

    [JsonPropertyName("status")]
    public required SignSignerStatus Status { get; set; }

    [Nullable]
    [JsonPropertyName("client_ref")]
    public string? ClientRef { get; set; }

    [Nullable]
    [JsonPropertyName("viewed_at")]
    public DateTime? ViewedAt { get; set; }

    [Nullable]
    [JsonPropertyName("signed_at")]
    public DateTime? SignedAt { get; set; }

    [Nullable]
    [JsonPropertyName("declined_at")]
    public DateTime? DeclinedAt { get; set; }

    [Nullable]
    [JsonPropertyName("decline_reason")]
    public string? DeclineReason { get; set; }

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
