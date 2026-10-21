using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[Serializable]
public record DomainRecord : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    /// <summary>
    /// What the record is for: `dkim` signs messages, `mail_from_mx` and `mail_from_spf` set up the bounce subdomain, `dmarc` is recommended but not required.
    /// </summary>
    [JsonPropertyName("purpose")]
    public required DomainRecordPurpose Purpose { get; set; }

    [JsonPropertyName("type")]
    public required DomainRecordType Type { get; set; }

    /// <summary>
    /// The fully qualified record name to create.
    /// </summary>
    [JsonPropertyName("name")]
    public required string Name { get; set; }

    [JsonPropertyName("value")]
    public required string Value { get; set; }

    /// <summary>
    /// `MX` records only.
    /// </summary>
    [Nullable]
    [JsonPropertyName("priority")]
    public long? Priority { get; set; }

    /// <summary>
    /// `false` for records that are only recommended.
    /// </summary>
    [JsonPropertyName("required")]
    public required bool Required { get; set; }

    /// <summary>
    /// What the last DNS check saw. `not_checked` means DNS has not been consulted yet.
    /// </summary>
    [JsonPropertyName("status")]
    public required DomainRecordStatus Status { get; set; }

    /// <summary>
    /// What DNS returned when it did not match.
    /// </summary>
    [JsonPropertyName("found")]
    public IEnumerable<string> Found { get; set; } = new List<string>();

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
