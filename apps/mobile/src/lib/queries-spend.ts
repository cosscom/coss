import type { BudgetsResponse, SpendResponse } from "@coss/companion";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "./auth";
import { get, retry, segment } from "./queries";

/** The organization's spend this month (or, without billing access, the member's own). */
export function useSpend(org: string) {
  const { api } = useAuth();
  return useQuery({
    queryKey: ["org", org, "spend"],
    queryFn: () => get<SpendResponse>(api, `/orgs/${segment(org)}/spend`),
    retry,
  });
}

export function useBudgets(org: string) {
  const { api } = useAuth();
  return useQuery({
    queryKey: ["org", org, "spend", "budgets"],
    queryFn: () => get<BudgetsResponse>(api, `/orgs/${segment(org)}/spend/budgets`),
    retry,
  });
}
