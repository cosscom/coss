import {
  includedUnitsText,
  limitText,
  planPriceText,
  plansWithText,
  rateText,
} from "../billing-text";
import type { Competitor } from "../compare";

// See src/lib/compare.ts for the rules: every fact about them checked and sourced, coss.com's
// prices and limits read from the catalog through the billing-text helpers.

const CHECKED = "2026-10-30";

/** coss.com's side of the rows every email comparison shares. */
const COSS = {
  pricing: `Per recipient, with no volume tiers to pick: ${rateText("email.recipients")}. Paid plans start at ${planPriceText("pro")}, all of it spendable on usage`,
  free: `Free plan: ${includedUnitsText("email.recipients")}, ${includedUnitsText("email.received")} and ${includedUnitsText("email.inboxes")}; ${limitText("domains", "free")} sending domain`,
  transactional:
    "REST API and an SMTP relay (smtp.coss.com), batch and scheduled sends, idempotency keys, templates with versions and locales",
  marketing:
    "Contacts with custom properties, audiences, segments, topics with a hosted preference center and double opt-in, broadcasts on a separate marketing stream",
  inbound:
    "Every environment has its own address under coss.com's inbound domain, or receive at your own domain with one MX record; an email.received webhook, content and attachments through the API",
  inboxes: `Inboxes give each agent its own address: mail kept as threads, replies from the same address; ${includedUnitsText("email.inboxes")} included`,
  subaccounts: `Sub-accounts on ${plansWithText("subaccounts")}: each with its own domains, SES tenant, reputation, quotas and suppression list (transactional email)`,
  channels:
    "SMS, Verify (one-time codes), Hooks (webhooks as a service) and Risk on the same API key and SDK",
  sdks: "TypeScript, plus generated SDKs for Python, Go, Ruby, PHP, Java and .NET; Laravel, Rails and Django mail drivers; a CLI and an MCP server",
  webhooks:
    "Standard Webhooks signatures, automatic retries, test events and `coss listen` to forward events to localhost",
  logs: `Every API request, email event and webhook attempt of an environment, searchable and exportable; log drains on ${plansWithText("logDrains")}`,
  dedicatedIps: `An add-on on ${plansWithText("dedicatedIps")}: Amazon SES managed dedicated IPs, warmed up automatically`,
  sandbox: "Sandbox environments with coss_test_ keys: the same API, nothing leaves coss.com",
} as const;

const RESEND: Competitor = {
  slug: "resend",
  name: "Resend",
  products: ["email", "marketing-email", "inbound-email", "inboxes"],
  query: "Resend alternative",
  verdict:
    "Resend and coss.com cover much of the same email ground. coss.com puts sub-accounts, sandbox environments and SMS on the same key.",
  lede: "Both are developer-first email APIs with SDKs, receiving and inboxes for agents. Resend has automations and a more collaborative inbox. coss.com is the choice when you send for your own customers, want a sandbox per environment, or need email next to SMS and one-time codes.",
  checked: CHECKED,
  rows: [
    {
      label: "Pricing model",
      coss: COSS.pricing,
      them: "Monthly plans by email volume (Pro from $20/month for 50,000 emails, Scale from $90/month for 100,000); marketing priced by contacts (Pro marketing from $40/month for 5,000)",
    },
    {
      label: "Free tier",
      coss: COSS.free,
      them: "3,000 emails a month, at most 100 a day, 3 domains",
    },
    {
      label: "Transactional email",
      coss: COSS.transactional,
      them: "REST API and SMTP, templates with an editor",
    },
    {
      label: "Marketing email",
      coss: COSS.marketing,
      them: "Contacts, segments, topics, broadcasts and automations (10,000 automation runs a month included)",
    },
    {
      label: "Receiving email",
      coss: COSS.inbound,
      them: "Any address at a Resend-managed .resend.app subdomain, or your domain with an MX record; a webhook, then the content through its receiving API",
    },
    {
      label: "Inboxes for agents",
      coss: COSS.inboxes,
      them: "Inboxes with threads, labels, drafts, folders, assignment and a configurable agent; 3 included, more at $1 per inbox a month",
    },
    {
      label: "Multi-tenant sending",
      coss: COSS.subaccounts,
      them: "Its multi-tenant guide offers one account with domain-scoped API keys (one shared reputation) or a separate Resend account per tenant",
    },
    {
      label: "Dedicated IPs",
      coss: COSS.dedicatedIps,
      them: "$30/month add-on on Scale, for senders above 3,000 emails a day",
    },
    {
      label: "Other channels",
      coss: COSS.channels,
      them: "Email",
    },
    {
      label: "SDKs",
      coss: COSS.sdks,
      them: "Node.js, PHP (and Laravel), Python, Ruby, Go, Java, Rust and .NET",
    },
    {
      label: "Webhooks",
      coss: COSS.webhooks,
      them: "Signed with Svix headers, with secret rotation through the API",
    },
    {
      label: "Logs",
      coss: COSS.logs,
      them: "API logs in the dashboard and the API; 30 days of data retention on Free, Pro and Scale",
    },
  ],
  chooseThem: [
    {
      title: "You want automations",
      body: "Resend runs automation workflows on contacts. coss.com's marketing email is broadcasts you write and schedule, with segments and topics deciding who gets them.",
    },
    {
      title: "Your team works in the inbox",
      body: "Resend's inboxes have labels, drafts, folders and assignment to teammates, and an agent you configure in the dashboard. coss.com's inboxes are threads an agent reads and replies to through the API.",
    },
    {
      title: "You write Rust or Elixir",
      body: "Resend has an official Rust SDK and an Elixir quickstart. coss.com's SDKs cover TypeScript, Python, Go, Ruby, PHP, Java and .NET.",
    },
  ],
  chooseCoss: [
    {
      title: "You send for your own customers",
      body: `A coss.com sub-account gives each of your users their own domains, SES tenant, reputation, quotas and suppressions, so one bad sender pauses only itself. Available on ${plansWithText("subaccounts")}; sandbox sub-accounts are free.`,
    },
    {
      title: "You want a real sandbox",
      body: "Every project has sandbox environments whose coss_test_ keys run the same API with nothing leaving coss.com, and a mailbox simulator for bounces and complaints.",
    },
    {
      title: "Email is one channel of several",
      body: "SMS, one-time codes (Verify), Hooks and Risk use the same API key, SDK, webhooks and logs as email.",
    },
    {
      title: "You debug from logs",
      body: "Each environment's log holds every API request, email event and webhook attempt, with lines about one email read as a single timeline.",
    },
  ],
  migration: [
    {
      title: "Import your Resend account",
      body: "The dashboard's Import page reads your account with a full-access Resend key and brings over domains, templates, contacts with their properties, segments as audiences, topics, suppressions and webhook endpoints. Nothing changes at Resend.",
      href: "/docs/migrate/resend",
    },
    {
      title: "Verify your domains",
      body: "Add coss.com's DNS records next to Resend's. Both can sign your mail, so you keep sending through Resend until you switch.",
      href: "/docs/email/domains",
    },
    {
      title: "Switch your code and webhooks",
      body: "Replace the Resend client with coss.email.send(), which takes the same kind of fields (and React Email components), or point SMTP at smtp.coss.com. Imported webhook endpoints start disabled: update your handler to coss.com's events and signatures, then enable them.",
      href: "/docs/webhooks",
    },
  ],
  faq: [
    {
      question: "Can I move my Resend account to coss.com?",
      answer:
        "Yes. The dashboard's Import page copies domains, templates, contacts, segments, topics, suppressions and webhook endpoints from Resend with a full-access API key, and only reads your Resend account.",
    },
    {
      question: "Does coss.com work with React Email?",
      answer:
        "Yes. Pass a React Email component as react to coss.email.send() and the SDK renders it into HTML and plain text, with @react-email/render installed as an optional peer dependency.",
    },
    {
      question: "Does coss.com have inboxes for AI agents like Resend?",
      answer:
        "Yes. A coss.com inbox is an address for an agent: mail to it is kept as threads, an inbox.message.received webhook announces each message, and the agent replies from the same address through the API.",
    },
    {
      question: "Is coss.com cheaper than Resend?",
      answer:
        "It depends on your volume. coss.com charges per recipient with no volume tiers, and a paid plan's fee is credit spent on usage; Resend sells monthly plans by email volume and marketing plans by contacts. Compare both pricing pages with your own numbers.",
    },
    {
      question: "Do I have to change my webhook handler when I leave Resend?",
      answer:
        "Yes. coss.com has its own event names and signs requests with Standard Webhooks headers, so imported endpoints are created disabled with new secrets until your handler is updated.",
    },
  ],
  sources: [
    { label: "Resend pricing", href: "https://resend.com/pricing" },
    {
      label: "Resend docs: receiving emails",
      href: "https://resend.com/docs/dashboard/receiving/introduction",
    },
    {
      label: "Resend docs: Inboxes",
      href: "https://resend.com/docs/dashboard/inboxes/introduction",
    },
    {
      label: "Resend docs: setting up Resend for multi-tenants",
      href: "https://resend.com/docs/knowledge-base/setting-up-resend-for-multi-tenants",
    },
    { label: "Resend docs: SDKs", href: "https://resend.com/docs/sdks" },
    {
      label: "Resend docs: verifying webhook requests",
      href: "https://resend.com/docs/webhooks/verify-webhooks-requests",
    },
  ],
};

const SENDGRID: Competitor = {
  slug: "sendgrid",
  name: "SendGrid",
  products: ["email", "marketing-email", "inbound-email", "subaccounts"],
  query: "SendGrid alternative",
  verdict:
    "SendGrid is a mature email API with a separate marketing suite. coss.com puts sending, marketing, receiving and sub-accounts in one API.",
  lede: "SendGrid, part of Twilio, sells its Email API and Marketing Campaigns as separate plans, with subusers and dedicated IPs on its higher tiers. coss.com prices everything per recipient, keeps a free plan that doesn't expire, and gives platforms sub-accounts with their own reputation.",
  checked: CHECKED,
  rows: [
    {
      label: "Pricing model",
      coss: COSS.pricing,
      them: "Email API plans by volume (Essentials from $19.95/month, Pro from $89.95/month, Premier custom); Marketing Campaigns priced separately (Basic from $15/month, Advanced from $60/month)",
    },
    {
      label: "Free tier",
      coss: COSS.free,
      them: "A 60-day free trial, 100 emails a day, no credit card",
    },
    {
      label: "Marketing email",
      coss: COSS.marketing,
      them: "Marketing Campaigns, a separate plan: contacts, segmentation, A/B testing, signup forms, and automation on Advanced",
    },
    {
      label: "Receiving email",
      coss: COSS.inbound,
      them: "Inbound Parse Webhook: an MX record to mx.sendgrid.net, each message posted to your URL as form data (or raw MIME), up to 30 MB",
    },
    {
      label: "Multi-tenant sending",
      coss: COSS.subaccounts,
      them: "Subusers on Pro, Premier and Advanced Marketing Campaigns: up to 15 (more through support), separate stats, linkable to dedicated IPs",
    },
    {
      label: "Dedicated IPs",
      coss: COSS.dedicatedIps,
      them: "1 included on Pro and Premier, more as an add-on",
    },
    {
      label: "Other channels",
      coss: COSS.channels,
      them: "SendGrid is Twilio's email product; Twilio sells SMS, WhatsApp, Voice and Verify as separate products",
    },
    {
      label: "SDKs",
      coss: COSS.sdks,
      them: "C#, Go, Java, Node.js, PHP, Python and Ruby",
    },
    {
      label: "Event webhooks",
      coss: COSS.webhooks,
      them: "1 event webhook on the trial, 2 on Essentials, 5 on Pro and Premier",
    },
    {
      label: "Activity history",
      coss: COSS.logs,
      them: "Searchable for 3 days on the trial and Essentials, 7 days on Pro and Premier; more for purchase",
    },
    {
      label: "Single sign-on",
      coss: `SAML and OIDC on ${plansWithText("sso")}`,
      them: "Included on Pro and Premier",
    },
  ],
  chooseThem: [
    {
      title: "You run campaigns with a marketing suite",
      body: "Marketing Campaigns has A/B testing, signup forms and automation. coss.com's marketing email is broadcasts to audiences and segments, without automation workflows.",
    },
    {
      title: "You validate addresses in bulk",
      body: "SendGrid's Pro and Premier plans include email validations (2,500 and 5,000).",
    },
    {
      title: "You're already on Twilio",
      body: "If your SMS, voice or WhatsApp already runs on Twilio, SendGrid keeps your email with the same vendor and account manager.",
    },
  ],
  chooseCoss: [
    {
      title: "One plan for everything",
      body: "Transactional and marketing email, receiving and inboxes are metered on one bill, with a free plan that doesn't expire.",
    },
    {
      title: "You send for your own customers",
      body: `Sub-accounts on ${plansWithText("subaccounts")} each get their own domains, SES tenant, reputation, quotas and suppression list, and pause on their own bounces and complaints, not yours.`,
    },
    {
      title: "Received email you can read later",
      body: "coss.com keeps each received email, so a webhook outage loses nothing: headers, bodies, attachments and the raw message stay readable through the API and the dashboard.",
    },
    {
      title: "Logs that cover webhooks too",
      body: "Each environment's log holds every API request, email event and webhook attempt, searchable and exportable as CSV or NDJSON.",
    },
  ],
  migration: [
    {
      title: "Import your SendGrid account",
      body: "The dashboard's Import page reads your account with a SendGrid API key and brings over domains, templates, contacts and lists, custom fields, suppressions and webhook endpoints. Nothing changes at SendGrid.",
      href: "/docs/migrate/sendgrid",
    },
    {
      title: "Verify your domains",
      body: "Add coss.com's DNS records next to SendGrid's, so you can keep sending through SendGrid until you switch.",
      href: "/docs/email/domains",
    },
    {
      title: "Switch your code and webhooks",
      body: "Send with coss.email.send() or point SMTP at smtp.coss.com with an API key as the password. Update your event handler to coss.com's events and Standard Webhooks signatures, then enable the imported endpoints.",
      href: "/docs/email/sending",
    },
  ],
  faq: [
    {
      question: "Can I import my SendGrid contacts and templates into coss.com?",
      answer:
        "Yes. The dashboard's Import page copies domains, templates, contacts and lists, suppressions and webhook endpoints from SendGrid. Templates that use something coss.com templates don't have are left as drafts with the parts to fix marked.",
    },
    {
      question: "Does coss.com have something like SendGrid subusers?",
      answer:
        "Yes, sub-accounts. Each has its own domains, SES tenant, reputation, quotas and suppression list, and is addressed by its id or by your own uid for that customer.",
    },
    {
      question: "Does coss.com have a free plan, or only a trial?",
      answer:
        "A free plan that doesn't expire. It includes a monthly allowance of sent and received email and a few inboxes; usage stops at the allowance until you choose a paid plan. See coss.com/pricing.",
    },
    {
      question: "Can I keep using SMTP when I leave SendGrid?",
      answer:
        "Yes. Point your app at smtp.coss.com with the username coss and an API key as the password. Each message goes through the same checks, suppressions, webhooks and logs as an API send.",
    },
  ],
  sources: [
    {
      label: "SendGrid Email API pricing",
      href: "https://www.twilio.com/en-us/products/email-api/pricing",
    },
    {
      label: "SendGrid Marketing Campaigns pricing",
      href: "https://www.twilio.com/en-us/products/marketing-campaigns/pricing",
    },
    {
      label: "SendGrid docs: Inbound Parse Webhook",
      href: "https://www.twilio.com/docs/sendgrid/for-developers/parsing-email/setting-up-the-inbound-parse-webhook",
    },
    {
      label: "SendGrid docs: subusers",
      href: "https://www.twilio.com/docs/sendgrid/ui/account-and-settings/subusers",
    },
    {
      label: "SendGrid docs: libraries",
      href: "https://www.twilio.com/docs/sendgrid/for-developers/sending-email/libraries",
    },
    { label: "Twilio pricing", href: "https://www.twilio.com/en-us/pricing" },
  ],
};

const POSTMARK: Competitor = {
  slug: "postmark",
  name: "Postmark",
  products: ["email", "marketing-email", "inbound-email"],
  query: "Postmark alternative",
  verdict:
    "Postmark is built for application email and does it well. coss.com adds contacts, audiences, per-customer sub-accounts and SMS on the same key.",
  lede: "Postmark keeps transactional and broadcast streams on separate infrastructure and leaves lists and campaigns to other tools. coss.com also separates the two streams, and manages the contacts, audiences and preferences marketing email needs.",
  checked: CHECKED,
  rows: [
    {
      label: "Pricing model",
      coss: COSS.pricing,
      them: "Basic $15/month, Pro $16.50/month, Platform $18/month, each for 10,000 emails; extra emails $1.80, $1.30 or $1.20 per 1,000",
    },
    {
      label: "Free tier",
      coss: COSS.free,
      them: "Developer tier: 100 emails a month, without expiry",
    },
    {
      label: "Transactional email",
      coss: COSS.transactional,
      them: "API and SMTP; transactional and broadcast message streams on separate IP ranges",
    },
    {
      label: "Marketing email",
      coss: COSS.marketing,
      them: "Broadcast streams send; list uploads, a WYSIWYG editor and campaign reporting stay outside Postmark",
    },
    {
      label: "Receiving email",
      coss: COSS.inbound,
      them: "An inbound address at inbound.postmarkapp.com or your own domain, posted to your app as JSON; on Pro and Platform",
    },
    {
      label: "Multi-tenant sending",
      coss: COSS.subaccounts,
      them: "Servers group streams: up to 5 on Basic, 10 on Pro, unlimited on Platform (for agencies and larger teams)",
    },
    {
      label: "Dedicated IPs",
      coss: COSS.dedicatedIps,
      them: "From $50/month per IP, for 300,000 emails a month or more, on Pro and above",
    },
    {
      label: "Webhook security",
      coss: COSS.webhooks,
      them: "No HMAC signatures: basic auth in the URL or an IP allowlist; retries on 5xx, 408 and 429",
    },
    {
      label: "Retention",
      coss: COSS.logs,
      them: "45 days by default; up to 365 days on Pro and Platform, from $5/month",
    },
    {
      label: "SDKs",
      coss: COSS.sdks,
      them: "TypeScript, Node.js, Python, Ruby, .NET, Java and PHP; a Rails gem, WordPress and Craft plugins, and a CLI",
    },
    {
      label: "Other channels",
      coss: COSS.channels,
      them: "Email",
    },
  ],
  chooseThem: [
    {
      title: "Only application email",
      body: "Postmark is built for application email and says so. If you never send newsletters, its narrow focus is a feature.",
    },
    {
      title: "You need a year of history",
      body: "Postmark's Pro and Platform plans keep message activity for up to 365 days.",
    },
    {
      title: "You run WordPress or Craft",
      body: "Postmark has official WordPress and Craft plugins. coss.com reaches those through its SMTP relay.",
    },
  ],
  chooseCoss: [
    {
      title: "Marketing email without another tool",
      body: "Contacts, audiences, segments, topics with a hosted preference center, double opt-in and broadcasts live next to your transactional email, on a separate stream with its own reputation.",
    },
    {
      title: "Signed webhooks",
      body: "Every coss.com webhook is signed with Standard Webhooks headers and a per-endpoint secret you can roll, instead of credentials in the URL.",
    },
    {
      title: "Receiving on every plan",
      body: `Every environment can receive email, the Free plan included (${includedUnitsText("email.received")}), and inboxes give agents addresses with threads.`,
    },
    {
      title: "You send for your own customers",
      body: `Sub-accounts on ${plansWithText("subaccounts")} each get their own domains, SES tenant, reputation, quotas and suppressions.`,
    },
  ],
  migration: [
    {
      title: "Import your Postmark account",
      body: "The dashboard's Import page brings over templates, suppressions and webhook endpoints with a server token, and domains with an account token. Nothing changes at Postmark.",
      href: "/docs/migrate/postmark",
    },
    {
      title: "Verify your domains",
      body: "Add coss.com's DNS records next to Postmark's, so you keep sending through Postmark until you switch.",
      href: "/docs/email/domains",
    },
    {
      title: "Map streams and switch your code",
      body: 'Transactional streams become ordinary sends; broadcast traffic becomes the marketing stream (stream: "marketing") or broadcasts. Then update webhook handlers and enable the imported endpoints.',
      href: "/docs/email/streams",
    },
  ],
  faq: [
    {
      question: "Does coss.com separate transactional and marketing email like Postmark's streams?",
      answer:
        "Yes. coss.com sends in two streams, each with its own sending configuration and reputation, so complaints about a newsletter never hold up password resets.",
    },
    {
      question: "Can I import my Postmark templates?",
      answer:
        "Yes. The dashboard's Import page converts Postmark templates to coss.com's template language and publishes the ones that convert exactly; the rest are kept as drafts with the parts to fix listed.",
    },
    {
      question: "Are coss.com webhooks signed?",
      answer:
        "Yes. Every request carries Standard Webhooks headers signed with the endpoint's whsec_ secret, and the SDK's verifyWebhook checks them.",
    },
    {
      question: "Can coss.com receive email like Postmark inbound?",
      answer:
        "Yes. Each environment has an address under coss.com's inbound domain with no DNS setup, or you can receive at your own domain with an MX record. Each message triggers an email.received webhook and stays readable through the API.",
    },
  ],
  sources: [
    { label: "Postmark pricing", href: "https://postmarkapp.com/pricing" },
    { label: "Postmark message streams", href: "https://postmarkapp.com/message-streams" },
    { label: "Postmark inbound", href: "https://postmarkapp.com/inbound" },
    {
      label: "Postmark docs: webhooks overview",
      href: "https://postmarkapp.com/developer/webhooks/webhooks-overview",
    },
    {
      label: "Postmark official libraries",
      href: "https://postmarkapp.com/developer/integration/official-libraries",
    },
  ],
};

const MAILGUN: Competitor = {
  slug: "mailgun",
  name: "Mailgun",
  products: ["email", "inbound-email", "subaccounts", "smtp"],
  query: "Mailgun alternative",
  verdict:
    "Mailgun is a sending API with flexible inbound routes and deliverability add-ons. coss.com adds marketing email, agent inboxes and logs on every plan.",
  lede: "Mailgun's plans scale log retention, inbound routes and dedicated IPs with the tier, and sell validation and inbox placement testing alongside. coss.com includes receiving, logs and marketing email on every plan and prices sending per recipient.",
  checked: CHECKED,
  rows: [
    {
      label: "Pricing model",
      coss: COSS.pricing,
      them: "Basic from $15/month for 10,000 emails, Foundation $35/month for 50,000, Scale $90/month for 100,000; extra emails from $1.80, $1.30 or $1.10 per 1,000",
    },
    {
      label: "Free tier",
      coss: COSS.free,
      them: "100 emails a day, 1 domain, 1 inbound route, 1 day of logs",
    },
    {
      label: "Transactional email",
      coss: COSS.transactional,
      them: "REST API and SMTP relay on every plan; a template builder from Foundation",
    },
    {
      label: "Receiving email",
      coss: COSS.inbound,
      them: "Inbound routes: forward, post to a URL or store temporarily; 1 route on Free, 5 on Basic, full routing from Foundation",
    },
    {
      label: "Marketing email",
      coss: COSS.marketing,
      them: "No campaign or newsletter builder on its pricing page",
    },
    {
      label: "Multi-tenant sending",
      coss: COSS.subaccounts,
      them: "Subaccounts with their own domains, IPs and API keys; usage billed with the primary account",
    },
    {
      label: "Dedicated IPs",
      coss: COSS.dedicatedIps,
      them: "One included at Foundation 100k and on Scale, more at $59/IP/month; IP pools on Scale",
    },
    {
      label: "Logs",
      coss: COSS.logs,
      them: "1 day on Free and Basic, 5 days on Foundation, 30 days on Scale",
    },
    {
      label: "Webhooks",
      coss: COSS.webhooks,
      them: "HMAC-SHA256 of a timestamp and token, keyed with a webhook signing key",
    },
    {
      label: "SDKs",
      coss: COSS.sdks,
      them: "Go, Node.js, PHP, Java, Ruby and Python",
    },
    {
      label: "Other channels",
      coss: COSS.channels,
      them: "Email",
    },
  ],
  chooseThem: [
    {
      title: "Address validation and inbox placement",
      body: "Mailgun sells email validations (5,000 included on Scale) and, through Mailgun Optimize, inbox placement tests and reputation monitoring.",
    },
    {
      title: "Programmable inbound routes",
      body: "Mailgun's routes filter incoming mail and forward it, post it to a URL or store it, rule by rule.",
    },
    {
      title: "Several IP pools",
      body: "Mailgun's Scale plan has dedicated IP pools. coss.com has one managed pool per organization.",
    },
  ],
  chooseCoss: [
    {
      title: "Marketing email included",
      body: "Contacts, audiences, segments, topics with a preference center and broadcasts, on a marketing stream with its own reputation.",
    },
    {
      title: "Logs from day one",
      body: "Every plan gets the environment log: API requests, email events and webhook attempts, searchable and exportable.",
    },
    {
      title: "Inboxes for agents",
      body: "Give an AI agent its own address: received mail is kept as threads and the agent replies from the same address.",
    },
    {
      title: "Sub-accounts with their own reputation",
      body: "Each coss.com sub-account has its own SES tenant, reputation and quotas, so a customer's bounces and complaints pause only that sub-account.",
    },
  ],
  migration: [
    {
      title: "Add and verify your domains",
      body: "Add each sending domain in coss.com and publish its DNS records; Domain Connect sets them up in one click where your DNS provider supports it.",
      href: "/docs/email/domains",
    },
    {
      title: "Bring over suppressions and contacts",
      body: "Export bounces, complaints and unsubscribes from Mailgun and import them with coss.email.suppressions.import (or as CSV on the Suppressions page) and contacts with coss.email.contacts.import.",
      href: "/docs/email/suppressions",
    },
    {
      title: "Switch sending and receiving",
      body: "Send with coss.email.send() or SMTP at smtp.coss.com, move inbound routes to a receiving domain with coss.com's MX record, and point webhook handlers at coss.com's events.",
      href: "/docs/email/receiving",
    },
  ],
  faq: [
    {
      question: "Is there an importer for Mailgun?",
      answer:
        "No. The dashboard's importer covers Resend, SendGrid and Postmark. From Mailgun, add your domains, import suppressions and contacts through the API or the dashboard, and switch your sending code or SMTP settings.",
    },
    {
      question: "Does coss.com have Mailgun-style subaccounts?",
      answer:
        "Yes. coss.com sub-accounts have their own domains, SES tenant, reputation, quotas and suppression list, and send transactional email for one of your customers.",
    },
    {
      question: "How does coss.com handle inbound email compared with Mailgun routes?",
      answer:
        "coss.com receives every message for an environment's addresses, stores it and sends an email.received webhook; your code decides what to do with it. Inboxes add threads and replies for agents.",
    },
    {
      question: "Does coss.com support SMTP like Mailgun?",
      answer:
        "Yes. smtp.coss.com accepts TLS on port 465 and STARTTLS on 587 (2465 and 2587 also work), with the username coss and an API key as the password.",
    },
  ],
  sources: [
    { label: "Mailgun pricing", href: "https://www.mailgun.com/pricing/" },
    {
      label: "Mailgun docs: subaccounts",
      href: "https://documentation.mailgun.com/docs/mailgun/user-manual/subaccounts/subaccounts",
    },
    {
      label: "Mailgun docs: receiving, forwarding and storing",
      href: "https://documentation.mailgun.com/docs/mailgun/user-manual/receive-forward-store/receive-forward-store",
    },
    {
      label: "Mailgun docs: securing webhooks",
      href: "https://documentation.mailgun.com/docs/mailgun/user-manual/webhooks/securing-webhooks",
    },
    {
      label: "Mailgun SDKs",
      href: "https://documentation.mailgun.com/docs/mailgun/sdk/introduction",
    },
  ],
};

const AMAZON_SES: Competitor = {
  slug: "amazon-ses",
  name: "Amazon SES",
  products: ["email", "marketing-email", "inbound-email", "subaccounts"],
  query: "Amazon SES alternative",
  verdict:
    "coss.com sends through Amazon SES. SES is the lower-level, lower-cost building block; coss.com adds what SES leaves to you.",
  lede: "SES is raw sending infrastructure: identities, configuration sets, receipt rules and tenants that you wire to S3, SNS and Lambda yourself. coss.com runs on SES, one tenant per organization, and adds the API, dashboard, contacts, broadcasts, stored inbound mail, signed webhooks and logs on top.",
  checked: CHECKED,
  rows: [
    {
      label: "Pricing model",
      coss: COSS.pricing,
      them: "$0.10 per 1,000 emails plus $0.12 per GB of attachments, or plans with a fixed monthly charge per region; receiving $0.10 per 1,000 emails plus $0.09 per 1,000 256 KB chunks",
    },
    {
      label: "Getting started",
      coss: `${COSS.free}. ${COSS.sandbox}`,
      them: "New accounts start in a sandbox per region (verified recipients only, 200 messages a day, 1 a second) until production access is granted; new AWS customers get Free Tier credits",
    },
    {
      label: "Transactional email",
      coss: COSS.transactional,
      them: "SES API v2 and an SMTP interface, templates, configuration sets",
    },
    {
      label: "Marketing email",
      coss: COSS.marketing,
      them: "One contact list per account with up to 20 topics and subscription management; you list contacts and call SendEmail yourself",
    },
    {
      label: "Receiving email",
      coss: COSS.inbound,
      them: "Receipt rules deliver raw MIME to S3 (up to 40 MB) or SNS (up to 150 KB), or invoke Lambda; only in some regions",
    },
    {
      label: "Multi-tenant sending",
      coss: COSS.subaccounts,
      them: "Tenants with their own identities, configuration sets, reputation policies and optional suppression lists; up to 10,000 per account by default",
    },
    {
      label: "Dedicated IPs",
      coss: COSS.dedicatedIps,
      them: "Standard $24.95/month per IP; managed $15/month plus a per-email fee; bring your own IPs",
    },
    {
      label: "Events",
      coss: COSS.webhooks,
      them: "Event publishing through configuration sets to SNS, EventBridge, Firehose, CloudWatch or Pinpoint",
    },
    {
      label: "Monitoring",
      coss: COSS.logs,
      them: "CloudWatch metrics; Virtual Deliverability Manager from $0.07 per 1,000 emails",
    },
    {
      label: "SDKs",
      coss: COSS.sdks,
      them: "The AWS SDKs and the AWS CLI",
    },
  ],
  chooseThem: [
    {
      title: "Lowest cost at volume",
      body: "SES's per-email price is hard to beat when you have the engineers to build bounce handling, tracking, list management and dashboards yourself.",
    },
    {
      title: "You're deep in AWS",
      body: "IAM, KMS-encrypted receiving to S3, Lambda receipt rules, EventBridge, Mail Manager and bring-your-own IPs fit an AWS-native stack.",
    },
    {
      title: "You need full control of the pipeline",
      body: "With SES you choose every configuration set, event destination and receipt rule. coss.com makes those choices for you.",
    },
  ],
  chooseCoss: [
    {
      title: "SES without the plumbing",
      body: "coss.com keeps the suppression list, does its own open and click tracking, stores received email and turns SES events into signed webhooks and per-recipient statuses.",
    },
    {
      title: "Marketing email you don't have to build",
      body: "Contacts, audiences, segments, topics with a hosted preference center, one-click unsubscribe, double opt-in and broadcasts.",
    },
    {
      title: "Tenants, managed",
      body: "Every organization and every sub-account gets its own SES tenant, with coss.com's own reputation checks, quotas and suppressions on top.",
    },
    {
      title: "Sandbox environments",
      body: "Test against the same API with coss_test_ keys and a mailbox simulator, with nothing sent and no recipient to verify.",
    },
  ],
  migration: [
    {
      title: "Add and verify your domains",
      body: "Add each domain in coss.com and publish its DKIM and MAIL FROM records. Your SES identities keep working until you switch.",
      href: "/docs/email/domains",
    },
    {
      title: "Bring over suppressions and contacts",
      body: "Export your SES suppression list and contact list and import them with coss.email.suppressions.import and coss.email.contacts.import.",
      href: "/docs/email/suppressions",
    },
    {
      title: "Replace SendEmail and your event pipeline",
      body: "Call coss.email.send() or use SMTP at smtp.coss.com, and replace SNS or EventBridge consumers with one webhook endpoint for coss.com's events.",
      href: "/docs/webhooks",
    },
  ],
  faq: [
    {
      question: "Does coss.com use Amazon SES?",
      answer:
        "Yes. coss.com delivers live email through Amazon SES, with one SES tenant per organization and per sub-account, and does suppressions, tracking, receiving, webhooks and logs itself.",
    },
    {
      question: "Why use coss.com instead of SES directly?",
      answer:
        "To skip building what SES leaves to you: a dashboard, suppressions, tracking, contacts and broadcasts, stored inbound mail, signed webhooks, logs and sandbox environments. If you already run all of that, SES on its own costs less.",
    },
    {
      question: "Do I need to request production access like SES?",
      answer:
        "No sandbox request. Sandbox environments work at sign-up, and live sending needs a verified email address, a live API key and a verified domain.",
    },
    {
      question: "Can coss.com receive email like SES receipt rules?",
      answer:
        "Yes. coss.com receives at an environment address or your domain, stores each message and sends an email.received webhook, so there is no S3 bucket, SNS topic or Lambda function to set up.",
    },
  ],
  sources: [
    { label: "Amazon SES pricing", href: "https://aws.amazon.com/ses/pricing/" },
    {
      label: "SES docs: moving out of the sandbox",
      href: "https://docs.aws.amazon.com/ses/latest/dg/request-production-access.html",
    },
    {
      label: "SES docs: email receiving concepts",
      href: "https://docs.aws.amazon.com/ses/latest/dg/receiving-email-concepts.html",
    },
    { label: "SES docs: tenants", href: "https://docs.aws.amazon.com/ses/latest/dg/tenants.html" },
    {
      label: "SES docs: list management",
      href: "https://docs.aws.amazon.com/ses/latest/dg/sending-email-list-management.html",
    },
    {
      label: "SES docs: event publishing",
      href: "https://docs.aws.amazon.com/ses/latest/dg/monitor-using-event-publishing.html",
    },
  ],
};

export const EMAIL_COMPETITORS: readonly Competitor[] = [
  RESEND,
  SENDGRID,
  POSTMARK,
  MAILGUN,
  AMAZON_SES,
];
