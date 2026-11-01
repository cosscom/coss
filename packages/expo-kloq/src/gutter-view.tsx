import { Column, Host, Row, Text } from "@expo/ui";
import { formatZoneTime, localeUsesHour12, zoneTimeAt } from "./gutter.ts";
import { useKloqSettings } from "./settings-context.tsx";
import { normalizeZoneColumns, type TimeZoneColumn, zoneAbbr, zoneCityLabel } from "./shared.ts";

export interface MultiTimeZoneGutterProps {
  /** Extra zones, in order. Omit to use the calendar's `timeZones`. */
  zones?: readonly (string | TimeZoneColumn)[];
  hour12?: boolean;
  /** Instant the clocks are read at. Defaults to now. */
  at?: Date;
}

/**
 * Zone summary strip. Per-hour columns stay on the time canvas (React Native);
 * this strip is the native clock for each zone.
 */
export function MultiTimeZoneGutter({ zones, hour12, at = new Date() }: MultiTimeZoneGutterProps) {
  const settings = useKloqSettings();
  const columns = normalizeZoneColumns(zones ?? settings.timeZones);
  const twelve = hour12 ?? settings.hour12 ?? localeUsesHour12(settings.locale);
  if (columns.length === 0) return null;
  return (
    <Host matchContents={{ vertical: true }} style={{ width: "100%" }}>
      <Row spacing={16}>
        {columns.map((column) => {
          const time = zoneTimeAt(at, column.timeZone);
          const label = column.label ?? zoneCityLabel(column.timeZone);
          return (
            <Column key={column.timeZone} spacing={2}>
              <Text textStyle={{ fontSize: 11 }}>{label}</Text>
              <Text textStyle={{ fontSize: 13, fontWeight: "600" }}>
                {`${formatZoneTime(time.hour, time.minute, twelve)} ${zoneAbbr(at, column.timeZone)}`}
              </Text>
            </Column>
          );
        })}
      </Row>
    </Host>
  );
}
