/**
 * The prototype's data: cal.com (GitHub's calcom/cal.com, renamed) as the pinned project, its
 * maintainers and contributors (GitHub identities, so their avatars are real) and a thread of
 * Prompt Requests in every state. Dates are relative to when the store seeds, so the thread
 * always reads as this week's.
 */
import type { Comment, Organization, Project, PromptRequest, User } from "./types.ts";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export function seed(now = new Date()) {
  const ago = (ms: number) => new Date(now.getTime() - ms);

  const users: User[] = [
    {
      handle: "peerrich",
      name: "Peer Richelsen",
      githubHandle: "peerrich",
      bio: "Co-Founder cal.com",
      company: "@calcom · @cosscom",
      location: "London",
      website: "https://cal.com/peer",
      followers: 1173,
      following: 38,
      joinedAt: new Date("2014-06-29"),
    },
    {
      handle: "pumfleet",
      name: "Bailey Pumfleet",
      githubHandle: "pumfleet",
      bio: "Co-founder and CEO @calcom",
      company: "@calcom",
      location: "New York City",
      website: "https://baileypumfleet.com",
      followers: 177,
      following: 2,
      joinedAt: new Date("2017-02-20"),
    },
    {
      handle: "keithwillcode",
      name: "Keith Williams",
      githubHandle: "keithwillcode",
      bio: "Head of Engineering @ Cal.com",
      company: "@calcom",
      location: "United States",
      followers: 155,
      following: 0,
      joinedAt: new Date("2012-10-11"),
    },
    {
      handle: "zomars",
      name: "Omar López",
      githubHandle: "zomars",
      bio: "Engineer, Cal.com.",
      company: "@calcom",
      location: "Mexico",
      followers: 530,
      following: 120,
      joinedAt: new Date("2011-02-14"),
    },
    {
      handle: "emrysal",
      name: "Alex van Andel",
      githubHandle: "emrysal",
      bio: "Engineering, Cal.com.",
      company: "@calcom",
      location: "Amsterdam",
      followers: 410,
      following: 60,
      joinedAt: new Date("2012-08-30"),
    },
    {
      handle: "hariombalhara",
      name: "Hariom Balhara",
      githubHandle: "hariombalhara",
      company: "@calcom",
      followers: 380,
      following: 45,
      joinedAt: new Date("2014-01-05"),
    },
    {
      handle: "joeauyeung",
      name: "Joe Au-Yeung",
      githubHandle: "joeauyeung",
      company: "@calcom",
      followers: 290,
      following: 30,
      joinedAt: new Date("2016-04-22"),
    },
    {
      handle: "sean-brydon",
      name: "Sean Brydon",
      githubHandle: "sean-brydon",
      company: "@calcom",
      followers: 310,
      following: 70,
      joinedAt: new Date("2017-10-02"),
    },
    {
      handle: "anikdhabal",
      name: "Anik Dhabal Babu",
      githubHandle: "anikdhabal",
      followers: 260,
      following: 85,
      joinedAt: new Date("2020-05-19"),
    },
    {
      handle: "Udit-takkar",
      name: "Udit Takkar",
      githubHandle: "Udit-takkar",
      followers: 450,
      following: 32,
      joinedAt: new Date("2019-11-12"),
    },
    {
      handle: "CarinaWolli",
      name: "Carina Wollendorfer",
      githubHandle: "CarinaWolli",
      company: "@calcom",
      followers: 180,
      following: 12,
      joinedAt: new Date("2021-03-08"),
    },
    {
      handle: "maya",
      avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330",
      name: "Maya Lindqvist",
      bio: "Runs a three-person studio on Cal.com. Writes prompts, not code.",
      location: "Gothenburg",
      followers: 42,
      following: 18,
      joinedAt: new Date("2025-11-02"),
    },
    {
      handle: "jonas",
      avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e",
      name: "Jonas Weber",
      bio: "Ops lead. I just want the calendar to behave.",
      location: "Berlin",
      followers: 17,
      following: 9,
      joinedAt: new Date("2026-01-20"),
    },
    {
      handle: "sam-dev",
      avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d",
      name: "Sam",
      followers: 2,
      following: 1,
      joinedAt: new Date("2026-10-01"),
    },
    {
      handle: "ritu",
      avatarUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2",
      name: "Ritu Sharma",
      bio: "Product designer. Accessibility first.",
      location: "Bengaluru",
      followers: 88,
      following: 54,
      joinedAt: new Date("2025-06-15"),
    },
  ];

  const organizations: Organization[] = [
    {
      slug: "calcom",
      name: "Cal.com",
      githubHandle: "calcom",
      description: "Scheduling infrastructure for absolutely everyone.",
      website: "https://cal.com",
      location: "Remote",
      members: ["peerrich", "pumfleet", "keithwillcode", "zomars", "emrysal"],
    },
    {
      slug: "cosscom",
      name: "coss.com",
      githubHandle: "cosscom",
      description: "Crowd opinionated source software.",
      website: "https://coss.com",
      members: ["peerrich", "pumfleet", "keithwillcode"],
    },
  ];

  const projects: Project[] = [
    {
      owner: "calcom",
      slug: "cal.com",
      name: "cal.com",
      description: "Scheduling infrastructure for absolutely everyone.",
      website: "https://cal.com",
      topics: [
        "scheduling",
        "calendar",
        "bookings",
        "round-robin",
        "integrations",
        "crowd-opinionated",
      ],
      stars: 49_100,
      watchers: 220,
      promptsToProduction: 16_499,
      contributorsCount: 1_128,
      releasesCount: 611,
      latestRelease: { tag: "v6.3.4", name: "v6.3.4", publishedAt: ago(12 * DAY) },
      maintainers: ["peerrich", "pumfleet", "keithwillcode", "zomars", "emrysal"],
      contributors: [
        { handle: "peerrich", prompts: 2_310 },
        { handle: "zomars", prompts: 1_874 },
        { handle: "emrysal", prompts: 1_402 },
        { handle: "hariombalhara", prompts: 1_215 },
        { handle: "pumfleet", prompts: 1_180 },
        { handle: "keithwillcode", prompts: 960 },
        { handle: "joeauyeung", prompts: 812 },
        { handle: "sean-brydon", prompts: 640 },
        { handle: "anikdhabal", prompts: 455 },
        { handle: "Udit-takkar", prompts: 390 },
        { handle: "CarinaWolli", prompts: 288 },
        { handle: "maya", prompts: 14 },
        { handle: "ritu", prompts: 9 },
        { handle: "jonas", prompts: 3 },
      ],
      readme: [
        {
          type: "hero",
          logo: "/readme/cal-logo.png",
          title: "Cal.com",
          tagline: "Scheduling infrastructure for absolutely everyone.",
          links: [
            { label: "Website", href: "https://cal.com" },
            { label: "Prompt requests", href: "/calcom/cal.com/prompts" },
            { label: "Contributing", href: "#contributing" },
          ],
        },
        {
          type: "badges",
          items: [
            { label: "Stars", value: "49.1k" },
            { label: "Prompts to production", value: "16,499" },
            { label: "Contributors", value: "1,128" },
            { label: "Help wanted", value: "Contribute" },
            { label: "Contributor Covenant", value: "1.4" },
          ],
        },
        { type: "heading", level: 2, text: "About Cal.com" },
        { type: "image", src: "/readme/booking-screen.gif", alt: "The booking screen" },
        {
          type: "paragraph",
          text: "**Cal.com** is the scheduling platform shaped by the people who use it: book meetings, run round-robins across a team, sell time, embed a booking page anywhere, and keep every calendar, conferencing and payment integration in one place.",
        },
        {
          type: "paragraph",
          text: "Everything here is live at [cal.com](https://cal.com). Nothing to install, nothing to run: what the crowd asks for and the maintainers approve ships to the product everyone is using.",
        },
        { type: "heading", level: 3, text: "How Cal.com is built on the hub" },
        {
          type: "list",
          items: [
            "**No code in public.** The source is the factory's business. What you see is the product, the decisions and what shipped.",
            "**Prompt Requests instead of pull requests.** Describe a change; the hub asks for what's missing; a maintainer approves or declines, with a comment either way.",
            "**Auto-allowed changes.** Copy, translation and accessibility fixes go straight to the factory. Features, behaviour changes and anything touching auth, billing or data wait for a maintainer.",
            "**Built, tested and deployed by Devin.** Every approved request gets a preview for everyone and a production link in the thread.",
          ],
        },
        {
          type: "callout",
          kind: "note",
          text: "A Prompt Request is about what Cal.com does, never about how it is built. Describe the behaviour you want; the factory decides the how.",
        },
        { type: "heading", level: 2, text: "Integrations" },
        {
          type: "paragraph",
          text: "Calendars, conferencing, CRMs and payments connect from the app store at [cal.com/apps](https://cal.com/apps). Missing one, or one misbehaving? That is a Prompt Request.",
        },
        {
          type: "list",
          items: [
            "**Calendars:** Google Calendar, Microsoft Outlook and Office 365, Zoho Calendar, Apple iCloud, CalDAV.",
            "**Conferencing:** Cal Video, Zoom, Google Meet, Microsoft Teams, Webex.",
            "**CRMs and tools:** HubSpot, Pipedrive, Zoho CRM, Zoho Bigin, Basecamp.",
            "**Payments:** Stripe, for selling time.",
          ],
        },
        { type: "heading", level: 2, text: "Contributing" },
        {
          type: "paragraph",
          text: "We welcome contributions! Whether it's a typo, a clearer email, a missing translation or a new booking option, your help makes Cal.com better. Open a [Prompt Request](/calcom/cal.com/prompts/new): say where it happens, what should change and what you expect afterwards.",
        },
        {
          type: "callout",
          kind: "tip",
          text: "Approved Prompt Requests ship to cal.com itself. Your change reaches everyone who schedules with it, usually the same day.",
        },
        { type: "heading", level: 3, text: "Good first prompts" },
        {
          type: "paragraph",
          text: 'Copy fixes, translations and accessibility improvements are auto-allowed: they skip the maintainers and go straight to the factory. They are the quickest way to see your name under "prompts to production".',
        },
        { type: "heading", level: 3, text: "Contributors" },
        { type: "contributors" },
        { type: "heading", level: 3, text: "Translations" },
        {
          type: "paragraph",
          text: "Don't code but still want to contribute? Nobody here does. Open a Prompt Request for your language: which pages, and what the tone should match.",
        },
        { type: "heading", level: 2, text: "Acknowledgements" },
        {
          type: "paragraph",
          text: "Cal.com is built on the work of its 1,128 contributors over five years of pull requests, and now of everyone who opens a Prompt Request. Special thanks to the maintainers who read every one.",
        },
      ],
      autoAllow: ["copy", "translation", "accessibility"],
      factory: "Devin",
      // About 290k tokens and $3.70 per prompt that reached production.
      factoryUsage: { inputTokens: 3_948_000_000, outputTokens: 864_000_000, costUsd: 61_430 },
      createdAt: new Date("2021-03-22"),
    },
    {
      owner: "calcom",
      slug: "platform",
      name: "platform",
      description:
        "Cal.com's Platform: atoms and the v2 API for building scheduling into your product.",
      website: "https://cal.com/platform",
      topics: ["scheduling", "api", "react", "typescript"],
      stars: 1_940,
      watchers: 31,
      promptsToProduction: 2_118,
      contributorsCount: 86,
      releasesCount: 142,
      latestRelease: { tag: "v2.14.0", name: "v2.14.0", publishedAt: ago(5 * DAY) },
      maintainers: ["peerrich", "keithwillcode"],
      contributors: [
        { handle: "keithwillcode", prompts: 410 },
        { handle: "peerrich", prompts: 120 },
        { handle: "sean-brydon", prompts: 98 },
      ],
      readme: [
        {
          type: "hero",
          title: "Platform",
          tagline: "Scheduling as building blocks.",
          links: [{ label: "Website", href: "https://cal.com/platform" }],
        },
        {
          type: "paragraph",
          text: "Drop-in atoms and an API for everything the Cal.com app does, so scheduling can live inside your own product.",
        },
        { type: "heading", level: 3, text: "Contributors" },
        { type: "contributors" },
      ],
      autoAllow: ["copy", "translation", "accessibility", "dependency"],
      factory: "Devin",
      factoryUsage: { inputTokens: 512_000_000, outputTokens: 118_000_000, costUsd: 8_120 },
      createdAt: new Date("2023-11-02"),
    },
    {
      owner: "cosscom",
      slug: "coss",
      name: "coss",
      description:
        "The coss.com platform: one API key, one SDK for email, hooks, risk and more; this hub.",
      website: "https://coss.com",
      topics: ["email", "webhooks", "risk", "typescript", "bun"],
      stars: 3_210,
      watchers: 48,
      promptsToProduction: 1_402,
      contributorsCount: 24,
      releasesCount: 38,
      latestRelease: { tag: "coss@0.9.0", name: "coss 0.9.0", publishedAt: ago(2 * DAY) },
      maintainers: ["peerrich", "pumfleet", "keithwillcode"],
      contributors: [
        { handle: "peerrich", prompts: 980 },
        { handle: "keithwillcode", prompts: 300 },
        { handle: "pumfleet", prompts: 122 },
      ],
      readme: [
        {
          type: "hero",
          title: "coss",
          tagline: "Everything that runs coss.com, the hub included.",
          links: [{ label: "Website", href: "https://coss.com" }],
        },
        {
          type: "paragraph",
          text: "One API key and one SDK for email, hooks, risk and more. The hub itself is a project on the hub.",
        },
        { type: "heading", level: 3, text: "Contributors" },
        { type: "contributors" },
      ],
      autoAllow: ["copy", "translation", "accessibility", "dependency"],
      factory: "Shipyard",
      factoryUsage: { inputTokens: 388_000_000, outputTokens: 92_000_000, costUsd: 5_960 },
      createdAt: new Date("2026-02-10"),
    },
  ];

  let commentIds = 0;
  const comment = (
    c: Omit<Comment, "id" | "parentId" | "createdAt" | "reactions"> & {
      parentId?: string;
      at: Date;
      reactions?: Comment["reactions"];
    },
  ): Comment => ({
    id: `c_${++commentIds}`,
    parentId: c.parentId ?? null,
    createdAt: c.at,
    kind: c.kind,
    author: c.author,
    body: c.body,
    questions: c.questions,
    link: c.link,
    reactions: c.reactions ?? [],
  });

  const pr = (
    p: Omit<
      PromptRequest,
      "id" | "owner" | "project" | "comments" | "updatedAt" | "reads" | "attachments"
    > & {
      comments?: Comment[];
      updatedAt?: Date;
      reads?: Record<string, Date>;
    },
  ): PromptRequest => {
    const comments = p.comments ?? [];
    const updatedAt = p.updatedAt ?? comments.at(-1)?.createdAt ?? p.createdAt;
    // Everyone who wrote in the thread read it when they wrote; the author reads every reply.
    const reads: Record<string, Date> = { [p.author]: updatedAt };
    for (const c of comments)
      if (c.author !== "hub" && c.author !== "factory") reads[c.author] = c.createdAt;
    return {
      id: `pr_calcom_${p.number}`,
      owner: "calcom",
      project: "cal.com",
      comments,
      updatedAt,
      reads: { ...reads, ...p.reads },
      attachments: [],
      ...p,
    };
  };

  // #1024: shipped, with a nested discussion. The thread everyone lands on first.
  const c1024 = {
    decision: comment({
      kind: "decision",
      author: "peerrich",
      body: "Yes. Keep the existing range picker, add the presets above it, and remember the last choice per user.",
      at: ago(3 * DAY + 2 * HOUR),
      reactions: [{ emoji: "🚀", by: ["maya", "jonas", "ritu"] }],
    }),
  };
  const c1024reply = comment({
    kind: "comment",
    author: "maya",
    body: "Remembering the last choice is exactly what I hoped for. Thank you!",
    parentId: c1024.decision.id,
    at: ago(3 * DAY + 1 * HOUR),
    reactions: [{ emoji: "❤️", by: ["peerrich"] }],
  });
  const c1024reply2 = comment({
    kind: "comment",
    author: "zomars",
    body: "@maya it'll be per browser for now; we can make it per account in a follow-up prompt.",
    parentId: c1024reply.id,
    at: ago(3 * DAY + 40 * MINUTE),
  });
  const c1024sent = comment({
    kind: "system",
    author: "hub",
    body: "Sent to Devin",
    at: ago(3 * DAY + 2 * HOUR - 5 * MINUTE),
  });
  const c1024f1 = comment({
    kind: "factory",
    author: "factory",
    body: "Started working on #1024. Reading the bookings list, the existing date range picker and the filters' URL state.",
    link: { label: "Session", href: "https://app.devin.ai/sessions/4c1f2a" },
    at: ago(3 * DAY + 2 * HOUR - 4 * MINUTE),
  });
  const c1024f2 = comment({
    kind: "factory",
    author: "factory",
    body: "Added presets (Today, This week, Last 7 days, Last 30 days, Custom) above the range picker; the choice is stored in localStorage per user. 14 end-to-end tests pass, plus 3 new ones for the presets.",
    at: ago(3 * DAY + 1 * HOUR + 30 * MINUTE),
  });
  const c1024f3 = comment({
    kind: "factory",
    author: "factory",
    body: "@maya #1024 is built, tested and deployed to a preview. Bookings can now be filtered by date presets.",
    link: { label: "Preview", href: "https://preview-1024.cal.com" },
    at: ago(3 * DAY + 1 * HOUR + 10 * MINUTE),
    reactions: [
      { emoji: "🎉", by: ["maya", "peerrich", "zomars", "jonas"] },
      { emoji: "👀", by: ["ritu"] },
    ],
  });
  const c1024prod = comment({
    kind: "system",
    author: "hub",
    body: "In production since v6.3.4",
    link: { label: "app.cal.com/bookings", href: "https://app.cal.com/bookings" },
    at: ago(2 * DAY + 20 * HOUR),
  });
  const c1024q = comment({
    kind: "comment",
    author: "jonas",
    body: "Does this also apply to the team bookings view?",
    at: ago(1 * DAY + 3 * HOUR),
  });
  const c1024qa = comment({
    kind: "comment",
    author: "maya",
    body: "It does, I checked after the deploy. Same presets.",
    parentId: c1024q.id,
    at: ago(1 * DAY + 2 * HOUR),
  });

  // #1031: approved, building right now (the fake factory plays it through on the page).
  const c1031sent = comment({
    kind: "system",
    author: "hub",
    body: "Sent to Devin",
    at: ago(40 * 1000),
  });
  const c1031dec = comment({
    kind: "decision",
    author: "emrysal",
    body: "Approved. Use the short abbreviation (CET, PST) and fall back to the UTC offset when there isn't one.",
    at: ago(45 * 1000),
  });

  // #1035: "page broken". Not enough to build anything.
  const c1035triage = comment({
    kind: "triage",
    author: "hub",
    body: "Thanks @sam-dev. Before a maintainer looks at this, the factory needs a bit more to go on. Reply here with:",
    questions: [
      "Which page? A link or the path (for example /bookings or the booking page of an event type).",
      "What happens now: an error, a blank page, something missing?",
      "What did you expect to see instead?",
    ],
    at: ago(2 * HOUR + 10 * MINUTE),
  });
  const c1035reply = comment({
    kind: "comment",
    author: "sam-dev",
    body: "the bookings one",
    at: ago(1 * HOUR + 50 * MINUTE),
  });
  const c1035triage2 = comment({
    kind: "triage",
    author: "hub",
    body: "Got it, the bookings page. Two more things and this can go to a maintainer:",
    questions: [
      "What happens now: an error, a blank page, something missing?",
      "What did you expect to see instead?",
    ],
    at: ago(1 * HOUR + 49 * MINUTE),
  });

  // #1033: awaiting review, with a question from a maintainer answered by the author.
  const c1033q = comment({
    kind: "comment",
    author: "keithwillcode",
    body: "Should the link in the email expire? Otherwise anyone who forwards it can reschedule.",
    at: ago(5 * HOUR),
  });
  const c1033a = comment({
    kind: "comment",
    author: "maya",
    body: "Yes, expire it with the booking (once the meeting happened the link is useless anyway), and show a 'this link has expired' page.",
    parentId: c1033q.id,
    at: ago(4 * HOUR + 30 * MINUTE),
  });
  const c1033a2 = comment({
    kind: "comment",
    author: "keithwillcode",
    body: "Good, that's what I'd do. Leaving the decision to @peerrich.",
    parentId: c1033a.id,
    at: ago(4 * HOUR),
  });

  // #1019: declined.
  const c1019dec = comment({
    kind: "decision",
    author: "zomars",
    body: "Declined. We're not changing the styling stack; it's a maintainer decision, not something a prompt can settle. Happy to take prompts about specific components that look off.",
    at: ago(9 * DAY),
  });

  // #1028: a translation, auto-allowed, straight to the factory.
  const c1028auto = comment({
    kind: "system",
    author: "hub",
    body: "Translation: auto-allowed by cal.com's rules, sent to Devin",
    at: ago(6 * DAY + 5 * HOUR),
  });
  const c1028f = comment({
    kind: "factory",
    author: "factory",
    body: "Added the Danish locale (da) for the booking page and the confirmation email, reviewed against the Swedish and Norwegian strings for consistency.",
    link: { label: "Preview", href: "https://preview-1028.cal.com/da" },
    at: ago(6 * DAY + 4 * HOUR),
  });
  const c1028prod = comment({
    kind: "system",
    author: "hub",
    body: "In production since v6.3.3",
    at: ago(5 * DAY + 20 * HOUR),
  });

  // #1030: awaiting review.
  // #1012: shipped, accessibility, auto-allowed.
  const c1012auto = comment({
    kind: "system",
    author: "hub",
    body: "Accessibility: auto-allowed by cal.com's rules, sent to Devin",
    at: ago(14 * DAY),
  });
  const c1012f = comment({
    kind: "factory",
    author: "factory",
    body: "Booking links on the dashboard now have a 'Copy link' button with a visible focus ring, and ⌘C / Ctrl+C copies the focused row's link. Screen readers announce 'Link copied'.",
    link: { label: "Preview", href: "https://preview-1012.cal.com" },
    at: ago(14 * DAY - 2 * HOUR),
  });
  const c1012prod = comment({
    kind: "system",
    author: "hub",
    body: "In production since v6.3.1",
    at: ago(13 * DAY),
  });

  const promptRequests: PromptRequest[] = [
    pr({
      number: 1035,
      title: "page broken",
      body: "page broken",
      author: "sam-dev",
      status: "needs_context",
      createdAt: ago(2 * HOUR + 11 * MINUTE),
      triage: {
        ready: false,
        kind: "fix",
        questions: c1035triage2.questions ?? [],
        model: "fake",
        at: ago(1 * HOUR + 49 * MINUTE),
      },
      decision: null,
      build: null,
      comments: [c1035triage, c1035reply, c1035triage2],
    }),
    pr({
      number: 1033,
      title: "Reschedule from the confirmation email without signing in",
      body: "When I get the booking confirmation email, 'Reschedule' sends me to a sign-in page. Most of my clients don't have a Cal.com account and give up there. The reschedule link in the email should open the reschedule page directly for that booking, no sign-in, like the cancel link already does. Expected: click 'Reschedule' in the email, pick a new slot, done.",
      author: "maya",
      status: "awaiting_review",
      createdAt: ago(6 * HOUR),
      triage: {
        ready: true,
        kind: "feature",
        questions: [],
        model: "typesafe-ai/jev",
        at: ago(6 * HOUR),
      },
      decision: null,
      build: null,
      comments: [c1033q, c1033a, c1033a2],
    }),
    pr({
      number: 1031,
      title: "Show the timezone abbreviation next to slot times",
      body: "On the booking page, slot times show as '14:00' with the timezone only in the dropdown at the top. People in my team book across three timezones and keep getting it wrong. Show the abbreviation next to each time ('14:00 CET') so it's obvious which zone the times are in. Expected: every slot shows its time followed by the selected timezone's short name.",
      author: "jonas",
      status: "building",
      createdAt: ago(3 * HOUR),
      triage: {
        ready: true,
        kind: "feature",
        questions: [],
        model: "typesafe-ai/jev",
        at: ago(3 * HOUR),
      },
      decision: {
        by: "emrysal",
        decision: "approved",
        comment: c1031dec.body,
        at: c1031dec.createdAt,
      },
      build: {
        provider: "fake",
        sessionId: `fake_1031_${ago(40 * 1000).getTime()}`,
        sessionUrl: "https://factory.hub.coss.test/sessions/fake_1031",
        startedAt: ago(40 * 1000),
        finishedAt: null,
        status: "running",
        seenUpdates: [],
      },
      comments: [c1031dec, c1031sent],
    }),
    pr({
      number: 1030,
      title: "Round-robin should skip team members who are on vacation",
      body: "Team event types with round-robin assignment still assign bookings to people who have an out-of-office entry for that day; the booking then gets cancelled by hand. When a member is marked out of office for the slot's date, the round-robin should skip them and pick the next available member. Expected: no bookings land on someone who's away.",
      author: "ritu",
      status: "awaiting_review",
      createdAt: ago(1 * DAY + 4 * HOUR),
      triage: {
        ready: true,
        kind: "fix",
        questions: [],
        model: "typesafe-ai/jev",
        at: ago(1 * DAY + 4 * HOUR),
      },
      decision: null,
      build: null,
      comments: [],
    }),
    pr({
      number: 1028,
      title: "Danish translation for the booking page",
      body: "The booking page and the confirmation email are not available in Danish; my clients see English. Add a Danish (da) translation for both, matching the tone of the Swedish one.",
      author: "maya",
      status: "in_production",
      createdAt: ago(6 * DAY + 5 * HOUR),
      triage: {
        ready: true,
        kind: "translation",
        questions: [],
        model: "typesafe-ai/jev",
        at: ago(6 * DAY + 5 * HOUR),
      },
      decision: {
        by: "hub",
        decision: "approved",
        comment: "Auto-allowed: translation.",
        at: ago(6 * DAY + 5 * HOUR),
      },
      build: {
        provider: "devin",
        sessionId: "devin_1028",
        sessionUrl: "https://app.devin.ai/sessions/9ab31e",
        startedAt: ago(6 * DAY + 5 * HOUR),
        finishedAt: ago(6 * DAY + 4 * HOUR),
        status: "finished",
        seenUpdates: [],
        previewUrl: "https://preview-1028.cal.com/da",
        productionUrl: "https://app.cal.com/da",
        usage: { inputTokens: 352_000, outputTokens: 68_000, costUsd: 1.7 },
      },
      comments: [c1028auto, c1028f, c1028prod],
    }),
    pr({
      number: 1024,
      title: "Filter the bookings list by date, with presets",
      body: "On /bookings I can only scroll. Let me filter the list by date. Presets like 'this week' and 'last 30 days' would cover almost everything I do, and a custom range for the rest. Expected: a date filter above the list that narrows it to the chosen range and stays selected when I come back.",
      author: "maya",
      status: "in_production",
      createdAt: ago(3 * DAY + 3 * HOUR),
      triage: {
        ready: true,
        kind: "feature",
        questions: [],
        model: "typesafe-ai/jev",
        at: ago(3 * DAY + 3 * HOUR),
      },
      decision: {
        by: "peerrich",
        decision: "approved",
        comment: c1024.decision.body,
        at: c1024.decision.createdAt,
      },
      build: {
        provider: "devin",
        sessionId: "devin_1024",
        sessionUrl: "https://app.devin.ai/sessions/4c1f2a",
        startedAt: c1024sent.createdAt,
        finishedAt: c1024f3.createdAt,
        status: "finished",
        seenUpdates: [],
        previewUrl: "https://preview-1024.cal.com",
        productionUrl: "https://app.cal.com/bookings",
        usage: { inputTokens: 1_560_000, outputTokens: 340_000, costUsd: 7.6 },
      },
      comments: [
        c1024.decision,
        c1024reply,
        c1024reply2,
        c1024sent,
        c1024f1,
        c1024f2,
        c1024f3,
        c1024prod,
        c1024q,
        c1024qa,
      ],
    }),
    pr({
      number: 1019,
      title: "Replace Tailwind with styled-components",
      body: "I prefer styled-components and think the project should move to it. Tailwind classes are hard to read.",
      author: "sam-dev",
      status: "declined",
      createdAt: ago(9 * DAY + 2 * HOUR),
      triage: {
        ready: true,
        kind: "design",
        questions: [],
        model: "typesafe-ai/jev",
        at: ago(9 * DAY + 2 * HOUR),
      },
      decision: {
        by: "zomars",
        decision: "declined",
        comment: c1019dec.body,
        at: c1019dec.createdAt,
      },
      build: null,
      comments: [c1019dec],
    }),
    pr({
      number: 1012,
      title: "Keyboard shortcut to copy a booking link",
      body: "On the event types list I copy booking links all day. Add a 'Copy link' control that's reachable by keyboard, and a shortcut (⌘C on a focused row) that copies the link. Expected: a visible, focusable copy button per row and a confirmation that the link was copied.",
      author: "ritu",
      status: "in_production",
      createdAt: ago(14 * DAY + 1 * HOUR),
      triage: {
        ready: true,
        kind: "accessibility",
        questions: [],
        model: "typesafe-ai/jev",
        at: ago(14 * DAY + 1 * HOUR),
      },
      decision: {
        by: "hub",
        decision: "approved",
        comment: "Auto-allowed: accessibility.",
        at: ago(14 * DAY),
      },
      build: {
        provider: "devin",
        sessionId: "devin_1012",
        sessionUrl: "https://app.devin.ai/sessions/77d0c1",
        startedAt: ago(14 * DAY),
        finishedAt: c1012f.createdAt,
        status: "finished",
        seenUpdates: [],
        previewUrl: "https://preview-1012.cal.com",
        productionUrl: "https://app.cal.com/event-types",
        usage: { inputTokens: 720_000, outputTokens: 160_000, costUsd: 3.5 },
      },
      comments: [c1012auto, c1012f, c1012prod],
    }),
  ];

  // The per-project counter continues after the seeded numbers.
  const counters = new Map<string, number>([["calcom/cal.com", 1035]]);

  return { users, organizations, projects, promptRequests, counters, commentIds };
}
