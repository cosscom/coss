using Coss.Core;

namespace Coss.Hooks;

public partial class HooksClient : IHooksClient
{
    private readonly RawClient _client;

    internal HooksClient(RawClient client)
    {
        _client = client;
        EventTypes = new EventTypesClient(_client);
        Applications = new ApplicationsClient(_client);
        Endpoints = new EndpointsClient(_client);
        Messages = new MessagesClient(_client);
        Deliveries = new DeliveriesClient(_client);
        Portal = new PortalClient(_client);
    }

    public IEventTypesClient EventTypes { get; }

    public IApplicationsClient Applications { get; }

    public IEndpointsClient Endpoints { get; }

    public IMessagesClient Messages { get; }

    public IDeliveriesClient Deliveries { get; }

    public IPortalClient Portal { get; }
}
