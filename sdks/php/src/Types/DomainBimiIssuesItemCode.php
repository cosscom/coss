<?php

namespace Coss\Types;

enum DomainBimiIssuesItemCode: string
{
    case DmarcMissing = "dmarc_missing";
    case DmarcNotEnforced = "dmarc_not_enforced";
    case DmarcPartial = "dmarc_partial";
    case RecordMultiple = "record_multiple";
    case RecordInvalid = "record_invalid";
    case LogoMissing = "logo_missing";
    case LogoNotHttps = "logo_not_https";
    case CertificateMissing = "certificate_missing";
    case CertificateNotHttps = "certificate_not_https";
}
