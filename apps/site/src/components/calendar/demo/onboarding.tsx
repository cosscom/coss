"use client";

/**
 * First-visit onboarding, wired in consumer-land like everything else.
 *
 * Four steps: hello → shape your week → time zones → the craft. Every
 * control writes straight into the live preferences, so the calendar
 * rearranges itself *behind the dialog* as you answer — the scrims are
 * deliberately light because the calendar is context, and this flow leans
 * on that: the preview is the real thing.
 *
 * "Temp" by design: one localStorage flag, one component. Seen it once and
 * it stays out of the way; replay any time from ⌘K → "Replay the tour".
 */

import { Button } from "@coss/ui/components/button";
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPopup,
  DialogTitle,
} from "@coss/ui/components/dialog";
import { Kbd, KbdGroup } from "@coss/ui/components/kbd";
import { Radio, RadioGroup } from "@coss/ui/components/radio-group";
import { Switch } from "@coss/ui/components/switch";
import { listCommonZones, localZone, registerCommands } from "kloq";
import type { KloqPreferences, WeekStart } from "kloq/settings";
import * as React from "react";
import { Label } from "@/components/calendar/ui/label";
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from "@/components/calendar/ui/select";

const ONBOARDED_KEY = "kloq-demo-onboarded";

/** The zone selects, in coss select rather than a native `<select>`. */
function ZoneSelect({
  label,
  offLabel,
  value,
  onChange,
}: {
  label: string;
  offLabel: string;
  value: string;
  onChange: (zone: string) => void;
}) {
  // Local zone first — it's the one you most often want back.
  const zones = React.useMemo(() => {
    const local = localZone();
    const common = listCommonZones();
    const rest = common.filter((z) => z.id !== local);
    const mine = common.find((z) => z.id === local);
    return mine ? [mine, ...rest] : rest;
  }, []);
  const items = React.useMemo(
    () => [{ value: "", label: offLabel }, ...zones.map((z) => ({ value: z.id, label: z.label }))],
    [zones, offLabel],
  );

  return (
    <Label className="flex w-full flex-col items-start gap-1.5 font-normal sm:flex-row sm:items-center sm:justify-between sm:gap-3">
      {label}
      <Select items={items} value={value} onValueChange={(v) => onChange(v ?? "")}>
        <SelectTrigger className="sm:w-48">
          <SelectValue />
        </SelectTrigger>
        <SelectPopup>
          {items.map((it) => (
            <SelectItem key={it.value} value={it.value}>
              {it.label}
            </SelectItem>
          ))}
        </SelectPopup>
      </Select>
    </Label>
  );
}

function CraftTip({ keys, children }: { keys: string[]; children: React.ReactNode }) {
  return (
    <li className="flex items-baseline justify-between gap-4">
      <span className="text-sm">{children}</span>
      <KbdGroup className="shrink-0">
        {keys.map((k) => (
          <Kbd key={k}>{k}</Kbd>
        ))}
      </KbdGroup>
    </li>
  );
}

export interface OnboardingDemoProps {
  prefs: KloqPreferences;
  /** Applies AND persists — the host passes its settings `change` handler. */
  onPrefsChange: (next: KloqPreferences) => void;
  displayZone: string;
  onDisplayZoneChange: (zone: string) => void;
  gutterZone: string;
  onGutterZoneChange: (zone: string) => void;
}

export function OnboardingDemo({
  prefs,
  onPrefsChange,
  displayZone,
  onDisplayZoneChange,
  gutterZone,
  onGutterZoneChange,
}: OnboardingDemoProps): React.ReactElement {
  const [open, setOpen] = React.useState(false);
  const [step, setStep] = React.useState(0);
  /*
   * First visit is FORCED: no Skip, and close requests (Esc, backdrop) are
   * refused until the last step's button completes the flow. A ⌘K replay
   * sets `forced` false, so revisiting stays politely dismissible.
   */
  const [forced, setForced] = React.useState(false);

  // First visit only — read in an effect so SSR and hydration agree.
  React.useEffect(() => {
    try {
      if (localStorage.getItem(ONBOARDED_KEY) !== "1") {
        setForced(true);
        setOpen(true);
      }
    } catch {
      // storage unavailable → they'll see it every time, which is fine
    }
  }, []);

  React.useEffect(
    () =>
      registerCommands({
        id: "demo:onboarding",
        label: "Replay the tour",
        keywords: "onboarding welcome setup intro help tour",
        group: "Demo",
        run: () => {
          setStep(0);
          setForced(false);
          setOpen(true);
        },
      }),
    [],
  );

  const close = () => {
    setOpen(false);
    setForced(false);
    try {
      localStorage.setItem(ONBOARDED_KEY, "1");
    } catch {
      // see above
    }
  };

  const steps: { title: string; body: React.ReactNode }[] = [
    {
      title: "Welcome to kloq",
      body: (
        <div className="flex flex-col items-start gap-4">
          <p className="text-sm text-muted-foreground">
            A calendar obsessed with micro-perfection — hand-tuned drag interactions, real
            optimistic sync, and a design mode that annotates the craft while you use it.
          </p>
          <p className="text-sm text-muted-foreground">
            Thirty seconds of setup, then it&apos;s all yours. Everything you pick here applies live
            — watch the calendar behind this dialog.
          </p>
        </div>
      ),
    },
    {
      title: "Shape your week",
      body: (
        <div className="flex flex-col gap-5">
          <RadioGroup
            aria-label="Start the week on"
            value={String(prefs.weekStartsOn)}
            onValueChange={(v) => onPrefsChange({ ...prefs, weekStartsOn: Number(v) as WeekStart })}
          >
            {(
              [
                [1, "Monday"],
                [0, "Sunday"],
                [6, "Saturday"],
              ] as const
            ).map(([day, name]) => (
              <Label key={day} className="flex items-center gap-2 font-normal">
                <Radio value={String(day)} />
                Start the week on {name}
              </Label>
            ))}
          </RadioGroup>
          <Label className="flex items-center justify-between gap-2 font-normal">
            Show weekends
            <Switch
              checked={prefs.showWeekends}
              onCheckedChange={(v) => onPrefsChange({ ...prefs, showWeekends: v === true })}
            />
          </Label>
        </div>
      ),
    },
    {
      title: "Where in the world?",
      body: (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            kloq can redraw the whole grid in another zone, or keep a second zone alongside your own
            — handy when half your meetings live in someone else&apos;s afternoon.
          </p>
          <div className="flex flex-col gap-3">
            <ZoneSelect
              label="Show my calendar in"
              offLabel="My local time"
              value={displayZone}
              onChange={onDisplayZoneChange}
            />
            <ZoneSelect
              label="Second time column"
              offLabel="None"
              value={gutterZone}
              onChange={onGutterZoneChange}
            />
          </div>
        </div>
      ),
    },
    {
      title: "The craft",
      body: (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            The parts we obsessed over. Try them — they&apos;re the whole point.
          </p>
          <ul className="flex flex-col gap-3">
            <CraftTip keys={["drag"]}>
              Drag anywhere to create — snaps to 15 minutes with visible magnetism
            </CraftTip>
            <CraftTip keys={["⌥", "drag"]}>Hold for 5-minute snapping</CraftTip>
            <CraftTip keys={["esc"]}>Mid-drag, springs the event back home</CraftTip>
            <CraftTip keys={["⌘", "K"]}>Every action, searchable — including this tour</CraftTip>
            <CraftTip keys={["⌥", "D"]}>Design mode: annotates the craft live</CraftTip>
          </ul>
        </div>
      ),
    },
  ];

  const last = step === steps.length - 1;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (o) setOpen(true);
        else if (!forced) close();
        // forced: ignore Esc / backdrop — the last step's button is the exit
      }}
    >
      <DialogPopup showCloseButton={false} className="max-w-md">
        <DialogHeader>
          <DialogTitle>{steps[step].title}</DialogTitle>
          <DialogDescription className="sr-only">
            kloq onboarding, step {step + 1} of {steps.length}
          </DialogDescription>
        </DialogHeader>
        <div className="px-6 pb-6">{steps[step].body}</div>
        <DialogFooter variant="bare" className="sm:items-center sm:justify-between">
          {/* progress dots — also the only place the step count appears */}
          <span aria-hidden className="flex items-center gap-1.5 max-sm:justify-center">
            {steps.map((_, i) => (
              <span
                key={i}
                className={
                  i === step
                    ? "size-1.5 rounded-full bg-foreground"
                    : "size-1.5 rounded-full bg-muted-foreground/32"
                }
              />
            ))}
          </span>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            {!forced && (
              <Button variant="ghost" size="sm" onClick={close}>
                Skip
              </Button>
            )}
            {step > 0 && (
              <Button variant="outline" size="sm" onClick={() => setStep(step - 1)}>
                Back
              </Button>
            )}
            <Button size="sm" onClick={() => (last ? close() : setStep(step + 1))}>
              {last ? "Start planning" : "Next"}
            </Button>
          </div>
        </DialogFooter>
      </DialogPopup>
    </Dialog>
  );
}
