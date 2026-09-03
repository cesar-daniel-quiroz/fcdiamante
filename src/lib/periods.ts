import { MONTHS } from "./types";
import type { BillingMode } from "./types";

// ---- Monthly ----
export const monthlyPeriod = (year: number, month0: number) =>
  `${year}-${String(month0 + 1).padStart(2, "0")}`;

export const monthlyLabel = (year: number, month0: number) =>
  `${MONTHS[month0]} ${year}`;

// ---- ISO week ----
export function isoWeek(d: Date): { year: number; week: number } {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = (date.getUTCDay() + 6) % 7; // Mon=0
  date.setUTCDate(date.getUTCDate() - day + 3); // nearest Thursday
  const firstThu = new Date(Date.UTC(date.getUTCFullYear(), 0, 4));
  const week =
    1 +
    Math.round(
      ((date.getTime() - firstThu.getTime()) / 86400000 -
        3 +
        ((firstThu.getUTCDay() + 6) % 7)) /
        7,
    );
  return { year: date.getUTCFullYear(), week };
}

export const weeklyPeriod = (d: Date) => {
  const { year, week } = isoWeek(d);
  return `${year}-W${String(week).padStart(2, "0")}`;
};

// Monday (00:00) of the ISO week containing d.
export function weekMonday(d: Date): Date {
  const date = new Date(d);
  const day = (date.getDay() + 6) % 7; // Mon=0
  date.setDate(date.getDate() - day);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function weeklyLabel(d: Date): string {
  const mon = weekMonday(d);
  const sun = new Date(mon);
  sun.setDate(sun.getDate() + 6);
  const fmt = (x: Date) => x.toLocaleDateString("es-MX", { day: "numeric", month: "short" });
  const { week } = isoWeek(d);
  return `Semana ${week} · ${fmt(mon)} – ${fmt(sun)}`;
}

// The active period key for a given date under a billing mode.
export function periodFor(mode: BillingMode, d: Date): string {
  return mode === "weekly" ? weeklyPeriod(d) : monthlyPeriod(d.getFullYear(), d.getMonth());
}

export const feeLabel = (mode: BillingMode) =>
  mode === "weekly" ? "Cuota semanal" : "Cuota mensual";
