<?php

namespace Coss\Types;

enum RiskPhoneCheckDegradedItem: string
{
    case PhoneData = "phone_data";
    case SimSwap = "sim_swap";
}
