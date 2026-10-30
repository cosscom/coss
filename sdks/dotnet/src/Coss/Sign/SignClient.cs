using Coss.Core;

namespace Coss.Sign;

public partial class SignClient : ISignClient
{
    private readonly RawClient _client;

    internal SignClient(RawClient client)
    {
        _client = client;
        Documents = new DocumentsClient(_client);
        Requests = new RequestsClient(_client);
        Sessions = new SessionsClient(_client);
        Settings = new SettingsClient(_client);
        Templates = new TemplatesClient(_client);
    }

    public IDocumentsClient Documents { get; }

    public IRequestsClient Requests { get; }

    public ISessionsClient Sessions { get; }

    public ISettingsClient Settings { get; }

    public ITemplatesClient Templates { get; }
}
