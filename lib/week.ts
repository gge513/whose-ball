/**
 * Week window, pinned to America/New_York (Boston cohort), Monday 00:00 to
 * Sunday 23:59:59, filtered on PR merged_at. This is the single definition of
 * "this week" (plan Decision 2). GitHub timestamps are UTC; we build the query
 * bounds with the correct NY offset so Friday-evening / Sunday-night PRs land
 * in the right week.
 *
 * `?week=YYYY-MM-DD` picks the week containing that date (lets the demo show a
 * populated board even if seed PRs are not in the literal current week).
 */

const TZ = "America/New_York";
const DAY_MS = 24 * 60 * 60 * 1000;
const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export type WeekWindow = {
  /** Monday, YYYY-MM-DD in NY. */
  startDate: string;
  /** Sunday, YYYY-MM-DD in NY. */
  endDate: string;
  /** GitHub search range for merged:, with NY offsets. */
  queryRange: string;
  /** Human label, e.g. "Jun 23 to Jun 29, 2026". */
  label: string;
  timezone: string;
};

/** YYYY-MM-DD calendar date for an instant, in NY. */
function nyDateParts(d: Date): { y: number; m: number; day: number } {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = fmt.formatToParts(d);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  return { y: get("year"), m: get("month"), day: get("day") };
}

/** NY UTC offset string ("-04:00" / "-05:00") for a given YYYY-MM-DD. */
function nyOffset(ymd: string): string {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    timeZoneName: "longOffset",
  });
  const parts = fmt.formatToParts(new Date(`${ymd}T12:00:00Z`));
  const name = parts.find((p) => p.type === "timeZoneName")?.value ?? "GMT-05:00";
  return name.replace("GMT", "") || "-05:00";
}

function ymd(utcMillisNoon: number): string {
  const d = new Date(utcMillisNoon);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function pretty(ymdStr: string): string {
  const [y, m, d] = ymdStr.split("-").map(Number);
  return `${MONTHS[m - 1]} ${d}, ${y}`;
}

export function getWeekWindow(weekParam?: string): WeekWindow {
  // Reference instant: the requested date (noon UTC to avoid edges) or now.
  const ref =
    weekParam && /^\d{4}-\d{2}-\d{2}$/.test(weekParam)
      ? new Date(`${weekParam}T12:00:00Z`)
      : new Date();

  // The NY calendar date of the reference, anchored at noon UTC for safe
  // day arithmetic (a date's weekday is timezone-independent).
  const { y, m, day } = nyDateParts(ref);
  const baseNoon = Date.UTC(y, m - 1, day, 12);
  const weekdayMon0 = (new Date(baseNoon).getUTCDay() + 6) % 7; // Mon=0..Sun=6

  const mondayNoon = baseNoon - weekdayMon0 * DAY_MS;
  const sundayNoon = mondayNoon + 6 * DAY_MS;

  const startDate = ymd(mondayNoon);
  const endDate = ymd(sundayNoon);
  const off = nyOffset(startDate);

  const queryRange = `${startDate}T00:00:00${off}..${endDate}T23:59:59${off}`;
  const startPretty = pretty(startDate);
  const endPretty = pretty(endDate);
  const label =
    startPretty.replace(`, ${y}`, "") + ` to ${endPretty}`;

  return { startDate, endDate, queryRange, label, timezone: TZ };
}
