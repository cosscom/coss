<?php

namespace Coss\Types;

enum StorageSettingsContentStorage: string
{
    case Store = "store";
    case Discard = "discard";
}
