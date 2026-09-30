import { beforeEach, describe, expect, it } from "vitest";
import { formatDate, formatDateTime, formatProjectBudget, relativeTime } from "./utils";
import { changeLocale } from "../i18n";

beforeEach(() => changeLocale("en"));

describe("formatDateTime", () => {
  // Local construction avoids assuming the test runner's timezone.
  const timestamp = new Date(2026, 8, 7, 13, 2, 54);

  it("preserves minute precision for existing callers", () => {
    expect(formatDateTime(timestamp)).toBe("Sep 7, 2026, 1:02 PM");
  });

  it("distinguishes activity in the same minute when seconds are requested", () => {
    expect(formatDateTime(timestamp, { includeSeconds: true })).toBe(
      "Sep 7, 2026, 1:02:54 PM",
    );
    expect(
      formatDateTime(new Date(2026, 8, 7, 13, 2, 55), { includeSeconds: true }),
    ).toBe("Sep 7, 2026, 1:02:55 PM");
  });

  it("formats serialized server timestamps identically to Date values", () => {
    expect(
      formatDateTime(timestamp.toISOString(), { includeSeconds: true }),
    ).toBe(formatDateTime(timestamp, { includeSeconds: true }));
  });

  it("uses the app language for dates, relative times and budget units", () => {
    changeLocale("zh-CN");
    expect(formatDate(timestamp)).toContain("2026年9月7日");
    expect(formatDateTime(timestamp, { includeSeconds: true })).toContain("13:02:54");
    expect(relativeTime(new Date(Date.now() - 5 * 60_000))).toBe("5 分钟前");
    expect(formatProjectBudget({ amountCents: 120_000, windowKind: "calendar_month_utc" })).toBe("$1,200.00/月");
    changeLocale("en");
    expect(formatDate(timestamp)).toBe("Sep 7, 2026");
    expect(relativeTime(new Date(Date.now() - 5 * 60_000))).toBe("5m ago");
  });
});
