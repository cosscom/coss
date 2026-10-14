import { CalendarFrame, THREE_FROM_TODAY, WEDNESDAY, WEEK } from "./calendar-frame";

export const HERO_HEIGHT = "h-120 sm:h-152";

export function HeroFrame() {
  return (
    <CalendarFrame
      chrome="hero"
      phone={WEDNESDAY}
      narrow={THREE_FROM_TODAY}
      wide={WEEK}
      className={HERO_HEIGHT}
    />
  );
}
