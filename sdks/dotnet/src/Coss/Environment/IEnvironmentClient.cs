namespace Coss;

public partial interface IEnvironmentClient
{
    /// <summary>
    /// Which environment, project and organization the API key belongs to, and the key itself. Any valid key can read its own environment (no permission needed): use it to check a key and show where it sends.
    /// </summary>
    WithRawResponseTask<Environment> GetAsync(
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );
}
