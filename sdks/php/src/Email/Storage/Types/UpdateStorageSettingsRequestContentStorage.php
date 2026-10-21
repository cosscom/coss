<?php

namespace Coss\Email\Storage\Types;

enum UpdateStorageSettingsRequestContentStorage: string
{
    case Store = "store";
    case Discard = "discard";
}
