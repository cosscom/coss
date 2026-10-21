using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

/// <summary>
/// Your organization's dedicated IPs (the Dedicated IPs add-on): a pool managed and warmed up automatically.
/// </summary>
[Serializable]
public record DedicatedIpPool : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    [JsonPropertyName("object")]
    public required DedicatedIpPoolObject Object { get; set; }

    /// <summary>
    /// `not_enabled` without the Dedicated IPs add-on. `provisioning` while the pool is set up (`waiting` when none is free yet), then `warming`: live emails go through the pool while it warms up its IPs, sending what they can't take yet from shared IPs. `ready` once at least 95% of the last 7 days' deliveries (at least 1,000) left from your dedicated IPs. `releasing` after the add-on ends: emails are back on shared IPs, and the pool is released a day later.
    /// </summary>
    [JsonPropertyName("status")]
    public required DedicatedIpPoolStatus Status { get; set; }

    /// <summary>
    /// The pool's IPs; the provider adds and removes them with volume.
    /// </summary>
    [JsonPropertyName("ips")]
    public IEnumerable<DedicatedIpPoolIpsItem> Ips { get; set; } =
        new List<DedicatedIpPoolIpsItem>();

    /// <summary>
    /// Share (0–1) of the last 7 days' deliveries that left from the pool's IPs (`null`: fewer than 1,000).
    /// </summary>
    [JsonPropertyName("dedicated_share")]
    public double? DedicatedShare { get; set; }

    /// <summary>
    /// What is holding the pool up, if anything.
    /// </summary>
    [JsonPropertyName("message")]
    public string? Message { get; set; }

    [JsonPropertyName("created_at")]
    public DateTime? CreatedAt { get; set; }

    /// <summary>
    /// When it was first `ready`.
    /// </summary>
    [JsonPropertyName("ready_at")]
    public DateTime? ReadyAt { get; set; }

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
