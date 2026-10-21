<?php

namespace Coss\Types;

enum DomainWebhookEventType: string
{
    case DomainDmarcReportReceived = "domain.dmarc_report_received";
}
