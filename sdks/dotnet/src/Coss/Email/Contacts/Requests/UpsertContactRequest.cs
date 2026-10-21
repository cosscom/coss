using Coss.Core;
using global::System.Text.Json.Serialization;
using OneOf;

namespace Coss.Email;

[Serializable]
public record UpsertContactRequest
{
    /// <summary>
    /// The contact's address. Display names are ignored; matching is case-insensitive.
    /// </summary>
    [JsonPropertyName("email")]
    public required string Email { get; set; }

    [JsonPropertyName("first_name")]
    public string? FirstName { get; set; }

    [JsonPropertyName("last_name")]
    public string? LastName { get; set; }

    /// <summary>
    /// Custom properties by key (define them first, see contact properties). Merged into the contact's existing properties; `null` removes one.
    /// </summary>
    [JsonPropertyName("properties")]
    public Dictionary<string, OneOf<string, double, bool>?>? Properties { get; set; }

    /// <summary>
    /// Sets the contact's consent. Omitted, a new contact is `subscribed` and an existing one keeps its status.
    /// </summary>
    [JsonPropertyName("status")]
    public UpsertContactRequestStatus? Status { get; set; }

    /// <summary>
    /// Audiences to add the contact to (it stays in the others).
    /// </summary>
    [JsonPropertyName("audience_ids")]
    public IEnumerable<string>? AudienceIds { get; set; }

    /// <summary>
    /// Choices per topic; topics left out keep the contact's choice.
    /// </summary>
    [JsonPropertyName("topics")]
    public IEnumerable<UpsertContactRequestTopicsItem>? Topics { get; set; }

    /// <summary>
    /// Ask the contact to confirm first (default: the marketing settings' `double_opt_in_default`): a new or unsubscribed contact becomes `pending` and gets a confirmation email; it is `subscribed` once they click its link. Can't be combined with `status: "subscribed"`, nor can the default (pass `false` to subscribe directly).
    /// </summary>
    [JsonPropertyName("double_opt_in")]
    public bool? DoubleOptIn { get; set; }

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
