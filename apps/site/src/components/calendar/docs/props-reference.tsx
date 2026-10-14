import { KLOQ_PROPS, type PropGroup } from "./kloq-props";
import { TypeTable } from "./ui/type-table";

/** The <Kloq> props table, from the same catalog the playground uses. Pass `group` to show one section. */
export function PropsReference({ group }: { group?: PropGroup | PropGroup[] }) {
  const groups = group === undefined ? null : new Set(Array.isArray(group) ? group : [group]);
  const rows = KLOQ_PROPS.filter((p) => groups === null || groups.has(p.group));
  return (
    <TypeTable
      type={Object.fromEntries(
        rows.map((p) => [
          p.name,
          { type: p.type, description: p.description, default: p.default, optional: true },
        ]),
      )}
    />
  );
}
