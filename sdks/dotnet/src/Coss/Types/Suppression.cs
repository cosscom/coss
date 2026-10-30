using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[Serializable]
public record Suppression : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    [JsonPropertyName("object")]
    public required SuppressionObject Object { get; set; }

    [JsonPropertyName("id")]
    public required string Id { get; set; }

    /// <summary>
    /// The bare, lower-cased address.
    /// </summary>
    [JsonPropertyName("address")]
    public required string Address { get; set; }

    /// <summary>
    /// `*` (every email) or a category.
    /// </summary>
    [JsonPropertyName("scope")]
    public required string Scope { get; set; }

    /// <summary>
    /// `bounce`: added after a permanent bounce. `complaint`: added after a spam complaint. `manual`: added one by one through the API or dashboard. `import`: added by a bulk import. `unsubscribe`: added by the recipient's one-click unsubscribe, scoped to the email's category.
    /// </summary>
    [JsonPropertyName("reason")]
    public required SuppressionReason Reason { get; set; }

    /// <summary>
    /// The email whose bounce or complaint added this entry.
    /// </summary>
    [Nullable]
    [JsonPropertyName("email_id")]
    public string? EmailId { get; set; }

    /// <summary>
    /// The sub-account whose list it is on; `null` for the environment's own list.
    /// </summary>
    [Nullable]
    [JsonPropertyName("subaccount_id")]
    public string? SubaccountId { get; set; }

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
