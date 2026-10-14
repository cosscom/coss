"use client";

import { Badge } from "@coss/ui/components/badge";
import { Button } from "@coss/ui/components/button";
import { parseQuickAdd, QuickAddInput, type QuickAddPreview, quickAddPreview } from "kloq";
import { useMemo, useState } from "react";
import { Bar } from "./examples/parts";
import { Dot, Live, LiveFrame, StatusBar, StatusText } from "./ui/live-frame";

const PHRASES = [
  "standup tomorrow 9:30am",
  "review 1-2pm with sam@acme.com",
  "dinner @ Padella friday 7pm",
  "offsite all day next friday",
];

export function QuickAddInputDemo() {
  const [now] = useState(() => new Date());
  const [value, setValue] = useState("");
  const [created, setCreated] = useState<QuickAddPreview[]>([]);

  const result = useMemo(() => parseQuickAdd(value, now), [value, now]);

  return (
    <LiveFrame>
      <StatusBar>
        <StatusText>
          <Live />
          <Dot />
          <span>QuickAddInput</span>
          <Dot />
          <span>nothing is saved</span>
        </StatusText>
        <StatusText className="hidden @lg:flex">↵ creates below</StatusText>
      </StatusBar>
      <Bar className="gap-x-2">
        <span>try</span>
        {PHRASES.map((phrase) => (
          <Button
            key={phrase}
            variant="outline"
            size="xs"
            className="max-w-full"
            onClick={() => setValue(phrase)}
          >
            <span className="min-w-0 truncate">{phrase}</span>
          </Button>
        ))}
      </Bar>
      <div className="bg-background">
        <QuickAddInput
          value={value}
          onValueChange={setValue}
          result={result}
          now={now}
          autoFocus={false}
          onCommit={() => {
            if (!result.start || !result.end) return;
            setCreated((c) => [quickAddPreview(result, now), ...c].slice(0, 3));
            setValue("");
          }}
        />
      </div>
      {created.length > 0 ? (
        <Bar edge="top" role="log" aria-label="Created" className="flex-col items-start gap-y-1">
          {created.map((p, i) => (
            <p key={i} className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
              <span className="text-foreground">{p.title}</span>
              {p.when ? <span>{p.when}</span> : null}
              {p.chips.map((chip) => (
                <Badge key={chip} variant="secondary">
                  {chip}
                </Badge>
              ))}
            </p>
          ))}
        </Bar>
      ) : null}
    </LiveFrame>
  );
}
