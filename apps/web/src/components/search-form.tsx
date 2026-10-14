import { Button } from "@coss/ui/components/button";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@coss/ui/components/input-group";
import { cn } from "@coss/ui/lib/utils";
import { SearchIcon } from "lucide-react";

/** A GET search form (`?q=`) that keeps the list's other filters; works without JavaScript. */
export function SearchForm(props: {
  action: string;
  query: string;
  placeholder: string;
  /** The query parameter (default `q`) and input type (default `search`). */
  name?: string;
  type?: "search" | "email";
  /** Other filters to keep, as hidden fields (empty values are left out). */
  keep?: Record<string, string | undefined>;
  className?: string;
}) {
  return (
    <form action={props.action} className={cn("flex w-full gap-2 sm:w-auto", props.className)}>
      {Object.entries(props.keep ?? {}).map(([name, value]) =>
        value ? <input key={name} name={name} type="hidden" value={value} /> : null,
      )}
      <InputGroup className="flex-1 sm:w-72">
        <InputGroupAddon>
          <SearchIcon />
        </InputGroupAddon>
        <InputGroupInput
          aria-label="Search"
          defaultValue={props.query}
          name={props.name ?? "q"}
          placeholder={props.placeholder}
          type={props.type ?? "search"}
        />
      </InputGroup>
      <Button type="submit" variant="outline">
        Search
      </Button>
    </form>
  );
}
