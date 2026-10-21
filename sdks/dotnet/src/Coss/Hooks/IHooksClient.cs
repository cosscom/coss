namespace Coss.Hooks;

public partial interface IHooksClient
{
    public IEventTypesClient EventTypes { get; }
    public IApplicationsClient Applications { get; }
    public IEndpointsClient Endpoints { get; }
    public IMessagesClient Messages { get; }
    public IDeliveriesClient Deliveries { get; }
    public IPortalClient Portal { get; }
}
