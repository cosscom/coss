<?php

namespace Coss\Types;

enum DomainRecordPurpose: string
{
    case Dkim = "dkim";
    case MailFromMx = "mail_from_mx";
    case MailFromSpf = "mail_from_spf";
    case Dmarc = "dmarc";
}
