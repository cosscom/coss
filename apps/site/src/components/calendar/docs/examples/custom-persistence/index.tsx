"use client";

import { Button } from "@coss/ui/components/button";
import { Kloq } from "kloq";
import { useMemo, useState } from "react";
import { SegmentedControl, SegmentedControlItem } from "@/components/calendar/ui/segmented-control";
import { Bar } from "../parts";
import { seedsFor, sessionAdapter, storageKey, TENANTS, type Tenant } from "./data";

export default function CustomPersistenceExample() {
  const [tenant, setTenant] = useState<Tenant>("acme");
  const [generation, setGeneration] = useState(0);
  const adapter = useMemo(() => sessionAdapter(tenant), [tenant]);
  const seeds = useMemo(() => seedsFor(tenant), [tenant]);

  const clear = () => {
    adapter.clear();
    setGeneration((n) => n + 1);
  };

  return (
    <div className="@container flex flex-col">
      <Bar>
        <SegmentedControl size="sm" aria-label="Tenant" value={tenant} onValueChange={setTenant}>
          {TENANTS.map((t) => (
            <SegmentedControlItem key={t} value={t}>
              {t}
            </SegmentedControlItem>
          ))}
        </SegmentedControl>
        <span className="min-w-0 wrap-anywhere">
          sessionStorage · <span className="text-foreground">{storageKey(tenant)}</span>
        </span>
        <Button size="xs" variant="outline" className="ms-auto" onClick={clear}>
          Clear this tenant
        </Button>
      </Bar>

      <div className="h-136">
        {/* the key remounts the store: a new tenant loads its own copy, a clear starts from seeds */}
        <Kloq
          key={`${tenant}:${generation}`}
          storage={`tenant-${tenant}`}
          persistence={adapter}
          defaultEvents={seeds}
          designMode={false}
        >
          <Kloq.Toolbar />
        </Kloq>
      </div>
    </div>
  );
}
