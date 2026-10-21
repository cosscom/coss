<?php

namespace Coss\Types;

enum ReceivedEmailAttachmentDisposition: string
{
    case Attachment = "attachment";
    case Inline = "inline";
}
