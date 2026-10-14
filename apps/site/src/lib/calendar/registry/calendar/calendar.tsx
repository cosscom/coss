"use client";

/**
 * coss calendar starter — a full-page calendar with the stock toolbar.
 *
 * Uncontrolled: coss calendar owns view, date and events, and persists them to
 * localStorage. Delete the wrapper div's height at your peril — <Kloq> is
 * h-full and renders into whatever box you give it.
 */

import { Kloq } from "kloq";
import "kloq/styles.css";

export function Calendar() {
  return (
    <div className="h-dvh">
      <Kloq>
        <Kloq.Toolbar />
      </Kloq>
    </div>
  );
}
