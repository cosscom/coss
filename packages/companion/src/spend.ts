// The organization's Spend pages (apps/web/src/app/[orgSlug]/spend): live usage charges this month
// by who caused them, and budgets. Amounts are integer cents.

/** The budget a member, project or key is held to this month (the dashboard's `BudgetCell`). */
export type SpendBudget = {
  /** A budget applies: its own, or (members) the organization's default. */
  applies: boolean;
  /** Its monthly amount; `null`: no limit (`applies`: exempt). */
  amount: number | null;
  spent: number;
  /** A member's budget that is the organization's default. */
  from_default: boolean;
};

export type SpendGroup = "member" | "project" | "environment" | "key";

export type SpendRow = {
  /** The member, project, environment or key id; `""`: spend without that kind of source. */
  id: string;
  label: string;
  detail: string | null;
  email_recipients: number;
  spent: number;
  /** In percent, to one decimal; `null`: nothing was spent. */
  share: number | null;
  /** `null`: the row has no budget (environments, spend without a source). */
  budget: SpendBudget | null;
  /** A used-up budget pauses its live sending. */
  paused: boolean;
};

/** A UTC day of the month so far. */
export type SpendDay = {
  date: string;
  /** Organization keys and the dashboard. */
  organization: number;
  /** Members' personal keys. */
  personal: number;
};

/** What a billing reader sees: the organization's spend. */
export type OrganizationSpendResponse = {
  view: "organization";
  period: { start: string; end: string };
  total: number;
  organization: number;
  personal: number;
  /** The billing account's spend limit; `null`: none. */
  spend_limit: number | null;
  /** Who a used-up budget pauses (names of members, projects and keys). */
  paused: string[];
  days: SpendDay[];
  breakdown: Record<SpendGroup, SpendRow[]>;
};

/** What other members see: their personal keys' spend. */
export type MemberSpendResponse = {
  view: "member";
  period: { start: string; end: string };
  total: number;
  budget: SpendBudget;
  /** What is left this month (0 once over budget); `null`: no limit. */
  remaining: number | null;
  over_budget: boolean;
  /** `personal`: their keys; `organization` is always 0. */
  days: SpendDay[];
  /** Their keys, most spend first (no budgets). */
  keys: SpendRow[];
};

export type SpendResponse = OrganizationSpendResponse | MemberSpendResponse;

export type BudgetMember = {
  user_id: string;
  name: string;
  email: string;
  role: string;
  budget: SpendBudget;
  /** A budget of their own (not the default). */
  own: boolean;
  paused: boolean;
};

export type BudgetProject = { id: string; name: string; budget: SpendBudget; paused: boolean };

export type BudgetKey = {
  api_key_id: string;
  label: string;
  /** "Project · Environment", and whose personal key it is. */
  detail: string | null;
  budget: SpendBudget;
  paused: boolean;
};

/** The Budgets page (billing readers only); budgets are changed on coss.com. */
export type BudgetsResponse = {
  /** The default member budget's monthly amount; `null`: no default (or one without a limit). */
  member_default: number | null;
  members: BudgetMember[];
  projects: BudgetProject[];
  /** Keys with a budget of their own. */
  keys: BudgetKey[];
};
