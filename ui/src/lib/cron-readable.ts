import { t, getLocale } from "../i18n";
/**
 * Tiny best-effort cron → plain-English helper for the routine Triggers section.
 * Not a full cron parser: it covers the common shapes Paperclip schedule triggers
 * produce (every N minutes/hours, daily at HH:MM, weekday/weekend, day-of-week).
 * Falls back to the raw expression when it can't confidently describe it.
 */

const DOW_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function pad2(value: number): string {
  return value.toString().padStart(2, "0");
}

function describeTime(minute: string, hour: string): string | null {
  const m = Number(minute);
  const h = Number(hour);
  if (!Number.isInteger(m) || !Number.isInteger(h)) return null;
  if (m < 0 || m > 59 || h < 0 || h > 23) return null;
  return `${pad2(h)}:${pad2(m)}`;
}

function describeDayOfWeek(dow: string): string | null {
  if (dow === "*" || dow === "?") return t("routineControls.cron.everyDay");
  if (dow === "1-5") return t("routineControls.cron.everyWeekday");
  if (dow === "0,6" || dow === "6,0" || dow === "0,7") return t("routineControls.cron.everyWeekend");
  const parts = dow.split(",").map((part) => part.trim());
  const names = parts.map((part) => {
    const n = Number(part);
    if (!Number.isInteger(n)) return null;
    const name = DOW_NAMES[n % 7];
    return name ? t(`routineControls.weekday.${name}`) : name;
  });
  if (names.some((name) => name === null)) return null;
  if (names.length === 1) return t("routineControls.cron.everyNamedDay", { days: names[0] });
  return t("routineControls.cron.everyNamedDay", { days: new Intl.ListFormat(getLocale(), { style: "long", type: "conjunction" }).format(names as string[]) });
}

export function describeCron(expression: string | null | undefined): string | null {
  if (!expression) return null;
  const trimmed = expression.trim();
  const fields = trimmed.split(/\s+/);
  // Standard 5-field cron: minute hour day-of-month month day-of-week
  if (fields.length !== 5) return null;
  const [minute, hour, dom, month, dow] = fields;

  // Every N minutes
  const everyMinutes = minute.match(/^\*\/(\d+)$/);
  if (everyMinutes && hour === "*" && dom === "*" && month === "*" && dow === "*") {
    return t("routineControls.cron.minutes", { count: Number(everyMinutes[1]) });
  }

  // Every N hours, on the minute
  const everyHours = hour.match(/^\*\/(\d+)$/);
  if (everyHours && /^\d+$/.test(minute) && dom === "*" && month === "*" && dow === "*") {
    return t("routineControls.cron.hours", { count: Number(everyHours[1]), minute: pad2(Number(minute)) });
  }

  // Hourly
  if (/^\d+$/.test(minute) && hour === "*" && dom === "*" && month === "*" && dow === "*") {
    return t("routineControls.cron.hourly", { minute: pad2(Number(minute)) });
  }

  // Daily / weekly at a fixed time
  if (/^\d+$/.test(minute) && /^\d+$/.test(hour) && month === "*") {
    const time = describeTime(minute, hour);
    if (!time) return null;
    if (dom === "*" && (dow === "*" || dow === "?")) {
      return t("routineControls.cron.daily", { time });
    }
    if (dom === "*") {
      const dowText = describeDayOfWeek(dow);
      if (dowText) return t("routineControls.cron.weekly", { days: dowText[0].toUpperCase() + dowText.slice(1), time });
    }
    if (/^\d+$/.test(dom) && (dow === "*" || dow === "?")) {
      return t("routineControls.cron.monthly", { day: dom, time });
    }
  }

  return null;
}
