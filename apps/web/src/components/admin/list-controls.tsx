import { Button } from "@coss/ui/components/button";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import Link from "next/link";
import { FilterLinks } from "../filter-links";
import { SearchForm } from "../search-form";

export const ADMIN_PAGE_SIZE = 50;

/** `?page=` as a 1-based page number. */
export function pageParam(value: string | string[] | undefined): number {
  const page = Number(Array.isArray(value) ? value[0] : value);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

export function stringParam(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
}

/** Builds a list URL, dropping empty and default values. */
export function listHref(
  path: string,
  params: Record<string, string | number | undefined>,
): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "" && !(key === "page" && value === 1)) {
      query.set(key, String(value));
    }
  }
  const search = query.toString();
  return search ? `${path}?${search}` : path;
}

/** A GET search form plus filter links; works without client JavaScript. */
export function ListFilters(props: {
  path: string;
  query: string;
  placeholder: string;
  status: string;
  statuses: { value: string; label: string }[];
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <FilterLinks
        options={props.statuses.map((option) => ({
          value: option.value,
          label: option.label,
          href: listHref(props.path, {
            q: props.query,
            status: option.value === "all" ? undefined : option.value,
          }),
        }))}
        value={props.status}
      />
      <SearchForm
        action={props.path}
        keep={{ status: props.status === "all" ? undefined : props.status }}
        placeholder={props.placeholder}
        query={props.query}
      />
    </div>
  );
}

/** Numbered pages (`?page=`) of an admin list: the range shown and previous / next. */
export function Pager(props: {
  page: number;
  total: number;
  shown: number;
  hrefFor: (page: number) => string;
}) {
  const pages = Math.max(1, Math.ceil(props.total / ADMIN_PAGE_SIZE));
  const first = (props.page - 1) * ADMIN_PAGE_SIZE;
  return (
    <div className="flex items-center justify-between gap-4 text-muted-foreground text-sm">
      <span className="font-mono text-xs tabular-nums">
        {props.total === 0 ? "No results" : `${first + 1}–${first + props.shown} of ${props.total}`}
      </span>
      <div className="flex gap-2">
        <Button
          disabled={props.page <= 1}
          render={props.page > 1 ? <Link href={props.hrefFor(props.page - 1)} /> : undefined}
          size="sm"
          variant="outline"
        >
          <ChevronLeftIcon />
          Previous
        </Button>
        <Button
          disabled={props.page >= pages}
          render={props.page < pages ? <Link href={props.hrefFor(props.page + 1)} /> : undefined}
          size="sm"
          variant="outline"
        >
          Next
          <ChevronRightIcon />
        </Button>
      </div>
    </div>
  );
}
