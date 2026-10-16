"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@coss/ui/components/avatar";
import { Button } from "@coss/ui/components/button";
import { Input } from "@coss/ui/components/input";
import { Textarea } from "@coss/ui/components/textarea";
import { cn } from "@coss/ui/lib/utils";
import { CameraIcon } from "lucide-react";
import { useActionState, useId, useState } from "react";
import { completeOnboarding } from "@/app/onboarding/actions";

type Initial = {
  handle: string;
  displayName: string;
  bio: string;
  company: string;
  location: string;
  website: string;
  role: "contributor" | "maintainer";
  builds: string;
  factory: string;
  avatarUrl: string | null;
};

const FACTORIES = [
  "Shipyard",
  "Devin",
  "Factory",
  "Claude Code",
  "T3 Code",
  "Something else",
  "None yet",
];

const STEPS = ["Who you are", "Where you work", "How you contribute"] as const;

/** Three short steps; one form, so the browser keeps everything until it's sent. */
export function OnboardingForm({ initial, next }: { initial: Initial; next: string }) {
  const [state, action, pending] = useActionState(completeOnboarding, null);
  const [step, setStep] = useState(0);
  const [preview, setPreview] = useState<string | null>(initial.avatarUrl);
  const [role, setRole] = useState(initial.role);
  const [factory, setFactory] = useState(initial.factory);
  const [displayName, setDisplayName] = useState(initial.displayName);
  const fileId = useId();
  const error = state?.error ?? null;
  const errorStep = state?.field
    ? ["handle", "displayName", "avatar"].includes(state.field)
      ? 0
      : ["company", "location", "website"].includes(state.field)
        ? 1
        : 2
    : null;
  const shownStep = errorStep ?? step;
  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

  return (
    <form action={action} className="flex flex-col gap-6">
      <input name="next" type="hidden" value={next} />
      <ol className="flex flex-wrap gap-1.5 font-mono text-[11px]">
        {STEPS.map((label, index) => (
          <li key={label}>
            <button
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-2 py-0.5 transition-colors",
                index === shownStep
                  ? "border-foreground bg-foreground text-background"
                  : index < shownStep
                    ? "text-foreground"
                    : "text-muted-foreground",
              )}
              onClick={() => setStep(index)}
              type="button"
            >
              <span>{index + 1}</span>
              <span>{label}</span>
            </button>
          </li>
        ))}
      </ol>

      <section className={cn("flex flex-col gap-5", shownStep !== 0 && "hidden")}>
        <div className="flex items-center gap-5">
          <label className="group relative cursor-pointer" htmlFor={fileId}>
            <Avatar className="size-24 border text-2xl">
              {preview && <AvatarImage alt="" src={preview} />}
              <AvatarFallback className="bg-muted">{initials || "?"}</AvatarFallback>
            </Avatar>
            <span className="absolute inset-0 flex items-center justify-center rounded-full bg-background/70 opacity-0 transition-opacity group-hover:opacity-100">
              <CameraIcon aria-hidden className="size-6" />
            </span>
          </label>
          <div className="flex flex-col gap-1.5">
            <Button render={<label htmlFor={fileId} />} size="sm" variant="outline">
              {preview ? "Change picture" : "Upload a picture"}
            </Button>
            <span className="text-muted-foreground text-xs">
              JPEG, PNG, WebP or GIF, 2 MB at most. Square works best.
            </span>
            <input
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="sr-only"
              id={fileId}
              name="avatar"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) setPreview(URL.createObjectURL(file));
              }}
              type="file"
            />
          </div>
        </div>
        <Field
          error={state?.field === "handle" ? error : null}
          hint="Your page lives at hub.coss.com/<handle>. Letters, digits and hyphens."
          label="Handle"
        >
          <div className="flex items-center gap-2">
            <span className="font-mono text-muted-foreground text-sm">hub.coss.com/</span>
            <Input
              defaultValue={initial.handle}
              maxLength={39}
              name="handle"
              pattern="[a-z0-9][a-z0-9-]{1,37}[a-z0-9]"
              placeholder="yourname"
              required
            />
          </div>
        </Field>
        <Field error={state?.field === "displayName" ? error : null} label="Display name">
          <Input
            maxLength={80}
            name="displayName"
            onChange={(event) => setDisplayName(event.target.value)}
            placeholder="How you're shown in threads"
            required
            value={displayName}
          />
        </Field>
        <Field error={state?.field === "bio" ? error : null} hint="One or two lines." label="Bio">
          <Textarea
            defaultValue={initial.bio}
            maxLength={400}
            name="bio"
            placeholder="Runs a three-person studio on Cal.com. Writes prompts, not code."
            rows={2}
          />
        </Field>
      </section>

      <section className={cn("flex flex-col gap-5", shownStep !== 1 && "hidden")}>
        <Field label="Company or team">
          <Input
            defaultValue={initial.company}
            maxLength={200}
            name="company"
            placeholder="@calcom, Acme, a studio of three…"
          />
        </Field>
        <Field label="Location">
          <Input
            defaultValue={initial.location}
            maxLength={200}
            name="location"
            placeholder="City, or 'anywhere'"
          />
        </Field>
        <Field error={state?.field === "website" ? error : null} label="Website">
          <Input
            defaultValue={initial.website}
            maxLength={200}
            name="website"
            placeholder="https://"
            type="url"
          />
        </Field>
      </section>

      <section className={cn("flex flex-col gap-5", shownStep !== 2 && "hidden")}>
        <Field
          error={state?.field === "role" ? error : null}
          hint="You can do both; this is what the hub shows first."
          label="On the hub you mostly…"
        >
          <input name="role" type="hidden" value={role} />
          <div className="grid gap-2 sm:grid-cols-2">
            {(
              [
                ["contributor", "Ask for changes", "Open Prompt Requests on projects you use."],
                [
                  "maintainer",
                  "Decide on changes",
                  "Run a project: approve, decline, set the rules.",
                ],
              ] as const
            ).map(([value, title, body]) => (
              <button
                aria-pressed={role === value}
                className={cn(
                  "flex flex-col items-start gap-1 rounded-lg border p-4 text-left transition-colors hover:bg-muted/40",
                  role === value && "border-foreground",
                )}
                key={value}
                onClick={() => setRole(value)}
                type="button"
              >
                <span className="font-semibold">{title}</span>
                <span className="text-muted-foreground text-sm">{body}</span>
              </button>
            ))}
          </div>
        </Field>
        <Field
          hint="Products, teams, the thing you'd open a prompt about tomorrow."
          label="What do you build or run?"
        >
          <Textarea
            defaultValue={initial.builds}
            maxLength={400}
            name="builds"
            placeholder="A booking site for a dental practice, on Cal.com and Stripe."
            rows={2}
          />
        </Field>
        <Field
          hint="The factory that builds what you approve. Contributors can skip this."
          label="Which software factory do you bring?"
        >
          <input name="factory" type="hidden" value={factory} />
          <div className="flex flex-wrap gap-1.5">
            {FACTORIES.map((name) => (
              <button
                aria-pressed={factory === name}
                className={cn(
                  "rounded-full border px-3 py-1 text-sm transition-colors hover:bg-muted/40",
                  factory === name && "border-foreground bg-foreground text-background",
                )}
                key={name}
                onClick={() => setFactory(factory === name ? "" : name)}
                type="button"
              >
                {name}
              </button>
            ))}
          </div>
        </Field>
      </section>

      {error && errorStep === null && (
        <p className="text-destructive-foreground text-sm" role="alert">
          {error}
        </p>
      )}
      <div className="flex items-center justify-between gap-3 border-t pt-5">
        <Button
          disabled={shownStep === 0}
          onClick={() => setStep(Math.max(0, shownStep - 1))}
          type="button"
          variant="ghost"
        >
          Back
        </Button>
        {shownStep < STEPS.length - 1 ? (
          <Button onClick={() => setStep(shownStep + 1)} type="button">
            Continue
          </Button>
        ) : (
          <Button disabled={pending} type="submit">
            {pending ? "Saving…" : "Done"}
          </Button>
        )}
      </div>
    </form>
  );
}

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string | null;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="font-medium text-sm">{label}</span>
      {children}
      {error ? (
        <span className="text-destructive-foreground text-xs" role="alert">
          {error}
        </span>
      ) : (
        hint && <span className="text-muted-foreground text-xs">{hint}</span>
      )}
    </div>
  );
}
