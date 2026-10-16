"use client";

import { Building2Icon, GitForkIcon, GlobeIcon, MailIcon, StarIcon, UsersIcon } from "lucide-react";
import Image from "next/image";
import avatar from "./peerrich.jpg";
import { useScene } from "./scene";

/*
 * An illustrative coss.com profile, laid out like a GitHub profile: the person, their pinned
 * project (with the stars and contributors coss.com imports) and, where GitHub draws commits, the
 * "Prompt to Production" graph: a year of prompts that shipped. Grayscale, like the rest of the page.
 */

const PROFILE = {
  name: "Peer Richelsen",
  handle: "PeerRich",
  bio: "Co-Founder cal.com",
  followers: "1.2k",
  following: "38",
  company: "@calcom",
  email: "peer@cal.com",
};

const PINNED = {
  owner: "calcom",
  name: "cal.diy",
  description: "Scheduling infrastructure for absolutely everyone.",
  stars: "49.1k",
  forks: "15.4k",
};

const ACTIVITY = {
  month: "October 2026",
  lines: ["Shipped 139 prompts to production in 8 projects", "Approved 212 Prompt Requests"],
};

const WEEKS = 52;
const DAYS = 7;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** The graph's last day (a static page: the year is illustrative, not live). */
const END = Date.UTC(2026, 9, 16);
const DAY_MS = 86_400_000;
const PROMPTS_IN_THE_LAST_YEAR = "1,894";

/** A seeded generator, so the server and the client draw the same year. */
function random(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1_664_525 + 1_013_904_223) % 4_294_967_296;
    return state / 4_294_967_296;
  };
}

/** `WEEKS` columns of `DAYS` levels (0–4), weekdays busier than weekends, ending on `END`. */
function year(): { levels: number[][]; months: { label: string; week: number }[] } {
  const next = random(482);
  const first = END - (WEEKS * DAYS - 1) * DAY_MS;
  const levels: number[][] = [];
  const months: { label: string; week: number }[] = [];
  for (let week = 0; week < WEEKS; week++) {
    const column: number[] = [];
    for (let day = 0; day < DAYS; day++) {
      const at = new Date(first + (week * DAYS + day) * DAY_MS);
      if (day === 0 && at.getUTCDate() <= 7) {
        months.push({ label: MONTHS[at.getUTCMonth()] ?? "", week });
      }
      const weekday = at.getUTCDay();
      const weekend = weekday === 0 || weekday === 6;
      const roll = next();
      const level = weekend
        ? roll < 0.55
          ? 0
          : roll < 0.85
            ? 1
            : 2
        : roll < 0.08
          ? 0
          : roll < 0.4
            ? 1
            : roll < 0.75
              ? 2
              : roll < 0.93
                ? 3
                : 4;
      column.push(level);
    }
    levels.push(column);
  }
  return { levels, months };
}

const YEAR = year();
const WEEKDAYS = ["", "Mon", "", "Wed", "", "Fri", ""];
const LEVEL_CLASS = [
  "bg-muted",
  "bg-foreground/25",
  "bg-foreground/45",
  "bg-foreground/70",
  "bg-foreground",
];

/** 13 · The year fills in week by week once it scrolls into view. */
export function ContributorProfile() {
  const { ref, play, reduced } = useScene(0.3);
  const instant = reduced || !play;

  return (
    <figure className="flex w-full max-w-5xl flex-col gap-3" ref={ref}>
      <div className="grid overflow-hidden rounded-xl border bg-background md:grid-cols-[18rem_1fr]">
        <aside className="flex flex-col gap-5 border-b px-5 py-6 md:border-r md:border-b-0">
          <Image
            alt=""
            className="size-32 rounded-full border grayscale sm:size-40"
            src={avatar}
            unoptimized
          />
          <div className="flex flex-col">
            <span className="font-semibold text-2xl tracking-[-0.02em]">{PROFILE.name}</span>
            <span className="text-lg text-muted-foreground">{PROFILE.handle}</span>
          </div>
          <span>{PROFILE.bio}</span>
          <span className="flex h-8 items-center justify-center rounded-md border text-sm">
            Follow
          </span>
          <ul className="flex flex-col gap-2 text-muted-foreground text-sm">
            <li className="flex items-center gap-2">
              <UsersIcon aria-hidden className="size-3.5 shrink-0" strokeWidth={1.5} />
              <span>
                <span className="text-foreground">{PROFILE.followers}</span> followers ·{" "}
                <span className="text-foreground">{PROFILE.following}</span> following
              </span>
            </li>
            <li className="flex items-center gap-2">
              <Building2Icon aria-hidden className="size-3.5 shrink-0" strokeWidth={1.5} />
              <span className="text-foreground">{PROFILE.company}</span>
            </li>
            <li className="flex items-center gap-2">
              <MailIcon aria-hidden className="size-3.5 shrink-0" strokeWidth={1.5} />
              <span>{PROFILE.email}</span>
            </li>
          </ul>
        </aside>

        <div className="flex min-w-0 flex-col">
          <div className="flex flex-col gap-3 border-b px-5 py-5">
            <span className="font-mono text-muted-foreground text-xs">
              Pinned · imported from GitHub
            </span>
            <div className="flex flex-col gap-2 rounded-lg border px-4 py-3.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="truncate">
                  {PINNED.owner}/<span className="font-semibold">{PINNED.name}</span>
                </span>
                <span className="flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
                  <GlobeIcon aria-hidden className="size-2.5" strokeWidth={1.5} />
                  Public
                </span>
              </div>
              <p className="text-muted-foreground text-sm">{PINNED.description}</p>
              <div className="flex items-center gap-4 font-mono text-muted-foreground text-xs">
                <span className="flex items-center gap-1">
                  <StarIcon aria-hidden className="size-3" strokeWidth={1.5} />
                  {PINNED.stars}
                </span>
                <span className="flex items-center gap-1">
                  <GitForkIcon aria-hidden className="size-3" strokeWidth={1.5} />
                  {PINNED.forks}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 border-b px-5 py-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span>
                <span className="font-semibold">{PROMPTS_IN_THE_LAST_YEAR}</span> prompts to
                production in the last year
              </span>
              <span className="font-mono text-muted-foreground text-xs">Prompt to Production</span>
            </div>
            <div className="overflow-x-auto">
              <div className="flex min-w-max flex-col gap-1.5 pr-1">
                <div className="relative ml-9 h-4">
                  {YEAR.months.map((month) => (
                    <span
                      className="absolute top-0 font-mono text-[10px] text-muted-foreground"
                      key={`${month.label}-${month.week}`}
                      style={{ left: `${month.week * 13}px` }}
                    >
                      {month.label}
                    </span>
                  ))}
                </div>
                <div className="flex gap-1.5">
                  <div className="flex w-7.5 flex-col gap-[3px]">
                    {WEEKDAYS.map((day, index) => (
                      <span
                        className="h-2.5 font-mono text-[10px] text-muted-foreground leading-[10px]"
                        key={`${day}${String(index)}`}
                      >
                        {day}
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-[3px]">
                    {YEAR.levels.map((column, week) => (
                      <div className="flex flex-col gap-[3px]" key={`w${String(week)}`}>
                        {column.map((level, day) => (
                          <span
                            className={`size-2.5 rounded-[2px] transition-opacity duration-300 ${LEVEL_CLASS[level] ?? "bg-muted"}`}
                            key={`d${String(day)}`}
                            style={{
                              opacity: play || reduced ? 1 : 0,
                              transitionDelay: instant ? "0ms" : `${week * 22 + day * 6}ms`,
                              transitionDuration: reduced ? "0ms" : undefined,
                            }}
                          />
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="ml-9 flex items-center justify-end gap-1 font-mono text-[10px] text-muted-foreground">
                  <span className="mr-1">Less</span>
                  {LEVEL_CLASS.map((cls) => (
                    <span className={`size-2.5 rounded-[2px] ${cls}`} key={cls} />
                  ))}
                  <span className="ml-1">More</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 px-5 py-5">
            <span className="font-mono text-muted-foreground text-xs">{ACTIVITY.month}</span>
            <ul className="flex flex-col gap-2">
              {ACTIVITY.lines.map((line) => (
                <li className="flex items-center gap-3 text-sm" key={line}>
                  <span className="size-1.5 shrink-0 rounded-full bg-foreground" />
                  {line}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
      <figcaption className="text-muted-foreground text-sm">
        An illustrative coss.com profile.
      </figcaption>
    </figure>
  );
}
