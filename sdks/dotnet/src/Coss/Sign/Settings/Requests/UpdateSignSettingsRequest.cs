using Coss.Core;
using global::System.Text.Json.Serialization;

namespace Coss.Sign;

[Serializable]
public record UpdateSignSettingsRequest
{
    [Optional]
    [JsonPropertyName("allowed_origins")]
    public IEnumerable<string>? AllowedOrigins { get; set; }

    [Nullable, Optional]
    [JsonPropertyName("display_name")]
    public Optional<string?> DisplayName { get; set; }

    [Nullable, Optional]
    [JsonPropertyName("accent_color")]
    public Optional<string?> AccentColor { get; set; }

    [Optional]
    [JsonPropertyName("theme")]
    public UpdateSignSettingsRequestTheme? Theme { get; set; }

    [Nullable, Optional]
    [JsonPropertyName("disclosure")]
    public Optional<string?> Disclosure { get; set; }

    [Nullable, Optional]
    [JsonPropertyName("email_from")]
    public Optional<string?> EmailFrom { get; set; }

    [Nullable, Optional]
    [JsonPropertyName("reminder_interval_days")]
    public Optional<int?> ReminderIntervalDays { get; set; }

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
