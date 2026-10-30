namespace Coss.Sign;

public partial interface ISignClient
{
    public IDocumentsClient Documents { get; }
    public IRequestsClient Requests { get; }
    public ISessionsClient Sessions { get; }
    public ISettingsClient Settings { get; }
    public ITemplatesClient Templates { get; }
}
